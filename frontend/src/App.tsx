import { Route, Routes } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home";
import { RoutePath } from "@src/constants/route-path";
import Singleplayer from "@src/pages/gamemodes/Singleplayer";
import Multiplayer from "./pages/gamemodes/Multiplayer";
import { useGameSocket } from "./hooks/useGameSocket";
import { useEffect, useMemo, useRef, useState } from "react";
import { NetworkMessage } from "./interfaces/NetworkMessage";
import { ServerResponse } from "./interfaces/ServerResponse";
import { ErrorLabel } from "./components/ErrorLabel";
import { NetworkContext, NetworkContextType } from "./contexts/NetworkContext";
import { GameMsgType, ResponseCode } from "./constants/game-msg-type";
import LoadingSpinner from "./components/LoadingSpinner";
import { getRandomInt } from "./utils/common-helpers";

export const WS_PORT_PARAM = "wsPort";
export const WS_TOKEN_PARAM = "wsToken";
function AppNetworkConfigWrapper() {
  const [wsServerUrl, setWsServerUrl] = useState<string | null>(null);

  // Network Setup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portParam = Number(
      params.get(WS_PORT_PARAM) ?? localStorage.getItem(WS_PORT_PARAM),
    );
    const tokenParam =
      params.get(WS_TOKEN_PARAM) ?? localStorage.getItem(WS_TOKEN_PARAM);

    if (!portParam || !tokenParam) {
      console.error("No token or port provided for WebSocket connection");
      alert("No token or port provided for WebSocket connection");
      return;
    }

    const port = portParam.toString();
    const token = tokenParam;
    localStorage.setItem(WS_PORT_PARAM, port);
    localStorage.setItem(WS_TOKEN_PARAM, token);
    setWsServerUrl(`ws://127.0.0.1:${port}?token=${token}`);
  }, []);

  return wsServerUrl !== null ? (
    <App wsServerUrl={wsServerUrl} />
  ) : (
    <h1 className="text-4xl text-center">
      ERROR! Could not retrieve proxy information!
    </h1>
  );
}

function App({ wsServerUrl }: { wsServerUrl: string }) {
  const startedConnectLoop = useRef<boolean>(false);
  const { sendMessage, connect, disconnect, isConnected } = useGameSocket(
    wsServerUrl,
    {
      onConnect: () => {
        console.log("Connection is open!");
      },
      onMessage: (msg: NetworkMessage) => triggerOnMessage(msg),
      onResponse: (res: ServerResponse) => triggerOnResponse(res),
      onDisconnect: (e: CloseEvent) => triggerOnDisconnect(e),
    },
  );
  const onMessageCallbacks = useRef<
    Map<GameMsgType, ((msg: NetworkMessage) => void)[]>
  >(new Map());
  const onResponseCallbacks = useRef<
    Map<GameMsgType, ((msg: ServerResponse) => void)[]>
  >(new Map());
  // const onDisconnectCallbacks = useRef<((e: CloseEvent) => void)[]>([]);

  const onMessage = (
    msgType: GameMsgType,
    cb: (msg: NetworkMessage) => void,
  ) => {
    const currCallbacks = onMessageCallbacks.current.get(msgType) ?? [];
    onMessageCallbacks.current.set(msgType, [...currCallbacks, cb]);
  };

  const onResponse = (
    msgType: GameMsgType,
    cb: (msg: ServerResponse) => void,
  ) => {
    const currCallbacks = onResponseCallbacks.current.get(msgType) ?? [];
    onResponseCallbacks.current.set(msgType, [...currCallbacks, cb]);
  };

  // const onDisconnect = (cb: (e: CloseEvent) => void) => {
  //   onDisconnectCallbacks.current.push(cb);
  // };

  const networkContext = useMemo<NetworkContextType>(
    () => ({
      onMessage,
      onResponse,
      sendMessage,
      // onDisconnect,
      isConnected,
      disconnect,
    }),
    [onMessage, onResponse, sendMessage, isConnected, disconnect],
  );

  function triggerOnMessage(msg: NetworkMessage) {
    const callbacks = onMessageCallbacks.current.get(msg.msgType);
    if (!callbacks) return;

    for (const cb of callbacks) cb(msg);
  }

  function triggerOnResponse(res: ServerResponse) {
    const callbacks = onResponseCallbacks.current.get(res.responseTo);
    if (!callbacks) return;
    for (const cb of callbacks) cb(res);
  }

  function triggerOnDisconnect(e: CloseEvent) {
    // // TODO: Call Subscribers
    console.log("Disconnected! Reconnecting in 2 seconds. CloseEvent:", e);
    setTimeout(attemptConnect, 2000);
  }

  const attemptConnect = () => {
    if (isConnected) return;
    let username = sessionStorage.getItem("username");
    if (!username) {
      username = `USER${getRandomInt(1000, 100000)}`;
      sessionStorage.setItem("username", username);
    }
    connect(username);
  };

  useEffect(() => {
    if (startedConnectLoop.current) return;
    startedConnectLoop.current = true;
    attemptConnect();
  }, []);

  onResponse(GameMsgType.SET_NAME, (res) => {
    const RECONNECT_TIMEOUT_MS = 2000;
    if (res.code == ResponseCode.ERROR)
      setTimeout(attemptConnect, RECONNECT_TIMEOUT_MS);
  });

  return (
    <NetworkContext.Provider value={networkContext}>
      {isConnected ? (
        <>
          <div className="py-5">
            <Routes>
              <Route path={RoutePath.Home} element={<Home />} />
              <Route
                path={RoutePath.GameModes.Singleplayer}
                element={<Singleplayer />}
              />
              <Route
                path={RoutePath.GameModes.Multiplayer}
                element={<Multiplayer />}
              />
            </Routes>
          </div>
        </>
      ) : (
        <div>
          <p className="text-3xl text-center">Connecting...</p>
          <LoadingSpinner />
        </div>
      )}
    </NetworkContext.Provider>
  );
}

export default AppNetworkConfigWrapper;

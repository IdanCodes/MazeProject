import { Route, Routes, useNavigate } from "react-router-dom";
import "./index.css";
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
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";
import { RedirectButton } from "./components/buttons/RedirectButton";
import PageTitle from "./components/PageTitle";
import { AuthenticatedHome, UnauthenticatedHome } from "./pages/Home";

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

function useNetworkContextHandler(wsServerUrl: string): {
  networkContext: NetworkContextType;
  signUp: (username: string, password: string) => Promise<string>;
  login: (username: string, password: string) => Promise<string>;
} {
  const startedConnectLoop = useRef<boolean>(false);
  const { sendMessage, login, signUp, disconnect, isConnected } = useGameSocket(
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
    Map<GameMsgType, Map<string, (msg: NetworkMessage) => void>>
  >(new Map());
  const onResponseCallbacks = useRef<
    Map<GameMsgType, Map<string, (msg: ServerResponse) => void>>
  >(new Map());
  // const onDisconnectCallbacks = useRef<((e: CloseEvent) => void)[]>([]);

  const onMessage = (
    callerId: string,
    msgType: GameMsgType,
    cb: (msg: NetworkMessage) => void,
  ) => {
    const currCallbackPairs =
      onMessageCallbacks.current.get(msgType) ?? new Map();
    currCallbackPairs.set(callerId, cb);
    onMessageCallbacks.current.set(msgType, currCallbackPairs);
    // onMessageCallbacks.current.set(msgType, [...currCallbacks, [callerId, cb]]);
  };

  const onResponse = (
    callerId: string,
    msgType: GameMsgType,
    cb: (msg: ServerResponse) => void,
  ) => {
    const currCallbackPairs =
      onResponseCallbacks.current.get(msgType) ?? new Map();
    currCallbackPairs.set(callerId, cb);
    onResponseCallbacks.current.set(msgType, currCallbackPairs);
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

    for (const cb of callbacks.values()) cb(msg);
  }

  function triggerOnResponse(res: ServerResponse) {
    const callbacks = onResponseCallbacks.current.get(res.responseTo);
    if (!callbacks) return;

    for (const cb of callbacks.values()) cb(res);
  }

  function triggerOnDisconnect(e: CloseEvent) {
    // // TODO: Call Subscribers
    console.log("Disconnected! CloseEvent:", e);
    // setTimeout(attemptConnect, 2000);
  }

  // const attemptConnect = () => {
  //   if (isConnected) return;
  //   let username = sessionStorage.getItem("username");
  //   if (!username) {
  //     username = `USER${getRandomInt(1000, 100000)}`;
  //     sessionStorage.setItem("username", username);
  //   }
  //   connect(username);
  // };

  // useEffect(() => {
  //   if (startedConnectLoop.current) return;
  //   startedConnectLoop.current = true;
  //   attemptConnect();
  // }, []);

  // onResponse(GameMsgType.SET_NAME, (res) => {
  //   const RECONNECT_TIMEOUT_MS = 2000;
  //   if (res.code == ResponseCode.ERROR)
  //     setTimeout(attemptConnect, RECONNECT_TIMEOUT_MS);
  // });

  return { networkContext, login, signUp };
}

function App({ wsServerUrl }: { wsServerUrl: string }) {
  const navigate = useNavigate();
  const { networkContext, login, signUp } =
    useNetworkContextHandler(wsServerUrl);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");

  const formLogin = (p: string) =>
    new Promise<string>(async (res, rej) => {
      try {
        await login(username, p);
        navigate(RoutePath.Home);
        setIsAuthenticated(true);
      } catch (e: unknown) {
        rej(e);
      }
    });
  const formSignUp = (p: string) =>
    new Promise<string>(async (res, rej) => {
      try {
        await signUp(username, p);
        navigate(RoutePath.Home);
        setIsAuthenticated(true);
      } catch (e: unknown) {
        rej(e);
      }
    });

  const disconnectAction = () => {
    networkContext.disconnect();
    setIsAuthenticated(false);
    navigate(RoutePath.Home);
  };

  return (
    <NetworkContext.Provider value={networkContext}>
      {networkContext.isConnected || true ? (
        isAuthenticated ? (
          <>
            <div className="py-5">
              <Routes>
                <Route
                  path={RoutePath.Home}
                  element={
                    <AuthenticatedHome
                      username={username}
                      disconnect={disconnectAction}
                    />
                  }
                />
                <Route
                  path={RoutePath.GameModes.Singleplayer}
                  element={<Singleplayer />}
                />
                <Route
                  path={RoutePath.GameModes.Multiplayer}
                  element={<Multiplayer playerName={username} />}
                />
                <Route path="*" element={<LoadingSpinner />} />
              </Routes>
            </div>
          </>
        ) : (
          <>
            <div className="py-5">
              <Routes>
                <Route
                  path={RoutePath.Home}
                  element={<UnauthenticatedHome />}
                />
                <Route
                  path={RoutePath.Authentication.Login}
                  element={
                    <LoginPage
                      usernameState={[username, setUsername]}
                      login={formLogin}
                    />
                  }
                />
                <Route
                  path={RoutePath.Authentication.Signup}
                  element={
                    <SignUpPage
                      usernameState={[username, setUsername]}
                      signUp={formSignUp}
                    />
                  }
                />
                <Route
                  path="*"
                  element={
                    <>
                      <PageTitle text="Page Not Found" />
                      <RedirectButton
                        path={RoutePath.Home}
                        className="text-3xl"
                      >
                        Home
                      </RedirectButton>
                    </>
                  }
                />
              </Routes>
            </div>
          </>
        )
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

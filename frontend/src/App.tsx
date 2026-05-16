import { Route, Routes, useNavigate } from "react-router-dom";
import "./index.css";
import { RoutePath } from "@src/constants/route-path";
import Singleplayer from "@src/pages/gamemodes/Singleplayer";
import Multiplayer from "./pages/gamemodes/Multiplayer/Multiplayer";
import { useGameSocket } from "./hooks/useGameSocket";
import { useEffect, useMemo, useRef, useState } from "react";
import { NetworkMessage } from "./interfaces/NetworkMessage";
import { ServerResponse } from "./interfaces/ServerResponse";
import { ErrorLabel } from "./components/ErrorLabel";
import { NetworkContext, NetworkContextType } from "./contexts/NetworkContext";
import { GameMsgType, ResponseCode } from "./constants/GameMsgType";
import LoadingSpinner from "./components/LoadingSpinner";
import { getRandomInt } from "./utils/common-helpers";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";
import { RedirectButton } from "./components/buttons/RedirectButton";
import PageTitle from "./components/PageTitle";
import { AuthenticatedHome, UnauthenticatedHome } from "./pages/Home";
import { Stats } from "./pages/Stats";
import PrimaryButton from "./components/buttons/PrimaryButton";

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
    <h1 className="text-4xl text-center flex justify-center">
      {/* ERROR! Could not retrieve proxy information! */}
      Retrieving proxy information...
      <LoadingSpinner />
    </h1>
  );
}

function useNetworkContextHandler(
  wsServerUrl: string,
  onDisconnect: ((e: CloseEvent) => void) | undefined = undefined,
): {
  networkContext: NetworkContextType;
  establishConnection: () => Promise<string>;
} {
  const { establishConnection, sendMessage, disconnect, isConnected } =
    useGameSocket(wsServerUrl, {
      onConnect: () => {
        console.log("Connection is open!");
      },
      onMessage: (msg: NetworkMessage) => triggerOnMessage(msg),
      onResponse: (res: ServerResponse) => triggerOnResponse(res),
      onDisconnect: (e: CloseEvent) => triggerOnDisconnect(e),
    });
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
    if (onDisconnect != undefined) onDisconnect(e);
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

  return { networkContext, establishConnection };
}

function App({ wsServerUrl }: { wsServerUrl: string }) {
  const { networkContext, establishConnection } = useNetworkContextHandler(
    wsServerUrl,
    onDisconnect,
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  function doConnect() {
    setIsConnecting(true);
    establishConnection()
      .then((s) => {
        console.log("Connection successful! Going to authentication...");
        setIsConnected(true);
      })
      .catch((error) => {
        alert(`Error occurred while connecting! ${error}. Check console`);
        console.error("Error occurred while connecting!", error);
      })
      .finally(() => {
        setIsConnecting(false);
      });
  }

  function onDisconnect(e: CloseEvent) {
    setIsConnecting(false);
    if (isConnected) {
      console.log("Disconnected: server closed the connection!", e);
      return setIsConnected(false);
    } else {
      console.log("Server denied connection!", e);
    }
  }

  return isConnected ? (
    <>
      <AppContent networkContext={networkContext} />
    </>
  ) : (
    <>
      <div className="flex justify-center w-full flex-col items-center">
        {isConnecting ? (
          <>
            <p className="text-center text-4xl">Connecting...</p>
            <LoadingSpinner size={20} />
          </>
        ) : (
          <PrimaryButton
            className="text-4xl bg-green-500 hover:bg-green-500/90 active:bg-green-600/90"
            onClick={doConnect}
          >
            Connect
          </PrimaryButton>
        )}
      </div>
    </>
  );
}

function AppContent({
  callerId = "AppContent",
  networkContext,
}: {
  callerId?: string;
  networkContext: NetworkContextType;
}) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");

  const authenticateUser = (msgType: GameMsgType, p: string) =>
    new Promise<string>((res, rej) => {
      try {
        networkContext.onResponse(callerId, msgType, (response) => {
          if (response.code == ResponseCode.ERROR) return rej(response.data);

          navigate(RoutePath.Home);
          setIsAuthenticated(true);
          res("Connected Successfuly");
        });
        networkContext.sendMessage(msgType, {
          username: username,
          password: p,
        });
      } catch (e: unknown) {
        rej(e as string);
      }
    });

  const formLogin = (p: string) =>
    new Promise<string>(async (res, rej) => {
      try {
        const r = await authenticateUser(GameMsgType.LOGIN, p);
        navigate(RoutePath.Home);
        setIsAuthenticated(true);
        res(r);
      } catch (e: unknown) {
        rej(e);
      }
    });
  const formSignUp = (p: string) =>
    new Promise<string>(async (res, rej) => {
      try {
        const r = await authenticateUser(GameMsgType.SIGN_UP, p);
        navigate(RoutePath.Home);
        setIsAuthenticated(true);
        res(r);
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
            <div className="py-0.5">
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
                  element={<Singleplayer playerName={username} />}
                />
                <Route
                  path={RoutePath.GameModes.Multiplayer}
                  element={<Multiplayer playerName={username} />}
                />
                <Route
                  path={RoutePath.Stats}
                  element={<Stats username={username} />}
                />
                <Route
                  path="*"
                  element={
                    <>
                      <RedirectButton
                        path={RoutePath.Home}
                        className="text-3xl"
                      >
                        Home
                      </RedirectButton>
                      <LoadingSpinner />
                    </>
                  }
                />
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

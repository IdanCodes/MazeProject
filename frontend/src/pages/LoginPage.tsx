import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { ErrorLabel } from "@src/components/ErrorLabel";
import { RoutePath } from "@src/constants/route-path";
import { usePassedState } from "@src/hooks/usePassedState";
import { PassedState } from "@src/types/passed-state";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function LoginPage({
  usernameState,
  login,
}: {
  usernameState: PassedState<string>;
  login: (password: string) => Promise<string>;
}) {
  const navigate = useNavigate();
  const [username, setUsername] = usePassedState(usernameState);
  const [password, setPassword] = useState<string>("");
  const [disableLogin, setDisableLogin] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");

  useEffect(() => {
    setUsername("");
    return () => {
      setUsername("");
    };
  }, []);

  function doLogin() {
    if (disableLogin) return;
    setDisableLogin(true);

    setLoginError("");
    login(password)
      .then((val) => {
        console.log("Login Response:", val);
      })
      .catch((err) => {
        console.error("Error in login! Error:", err);
        setLoginError(err);
      })
      .finally(() => {
        setDisableLogin(false);
      });
  }

  return (
    <>
      <div className="w-full">
        <PrimaryButton
          className="text-xl"
          onClick={() => navigate(RoutePath.Home)}
        >
          Back
        </PrimaryButton>
        <h1 className="text-3xl text-center">Log In</h1>
        <form onSubmit={doLogin}>
          <div className="my-4 mx-auto w-4/5 py-5 flex gap-3 flex-col border-3 rounded-2xl">
            <div className="flex justify-around">
              <p className="text-3xl">Username:</p>
              <input
                className="text-2xl border-2 rounded-xl py-1 px-1"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              ></input>
            </div>
            <div className="flex justify-around">
              <p className="text-3xl">Password:</p>
              <input
                className="text-2xl border-2 rounded-xl py-1 px-1 "
                placeholder="Password"
                value={password}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
              ></input>
            </div>
          </div>
          <div className="mx-auto w-fit my-2">
            <ErrorLabel text={loginError} />
          </div>
          <PrimaryButton
            btnType="submit"
            className="mx-auto text-2xl"
            onClick={doLogin}
            disabled={disableLogin}
          >
            Log In
          </PrimaryButton>
        </form>
      </div>
    </>
  );
}

import { CredentialsForm } from "@src/components/authentication/CredentialsForm";
import PrimaryButton from "@src/components/buttons/PrimaryButton";
import PageTitle from "@src/components/PageTitle";
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
        <PageTitle text="Log In" />
        <CredentialsForm
          usernameState={usernameState}
          passwordState={[password, setPassword]}
          errorTxt={loginError}
          btnTxt="Log In"
          disabled={disableLogin}
          onSubmit={doLogin}
        />
      </div>
    </>
  );
}

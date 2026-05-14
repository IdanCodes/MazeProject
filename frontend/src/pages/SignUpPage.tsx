import { CredentialsForm } from "@src/components/authentication/CredentialsForm";
import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { RedirectButton } from "@src/components/buttons/RedirectButton";
import PageTitle from "@src/components/PageTitle";
import { RoutePath } from "@src/constants/route-path";
import { usePassedState } from "@src/hooks/usePassedState";
import { PassedState } from "@src/types/passed-state";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function SignUpPage({
  usernameState,
  signUp,
}: {
  usernameState: PassedState<string>;
  signUp: (password: string) => Promise<string>;
}) {
  const navigate = useNavigate();
  const [username, setUsername] = usePassedState(usernameState);
  const [password, setPassword] = useState<string>("");
  const [disableSignUp, setDisableSignUp] = useState<boolean>(false);
  const [signUpError, setSignUpError] = useState<string>("");

  useEffect(() => {
    setUsername("");
  }, []);

  function doSignUp() {
    if (disableSignUp) return;
    setDisableSignUp(true);

    setSignUpError("");
    signUp(password).catch((err) => {
      setSignUpError(err);
      setDisableSignUp(false);
    });
  }

  return (
    <>
      <div className="w-full">
        <RedirectButton
          path={RoutePath.Home}
          className="text-2xl absolute left-10"
        >
          Back
        </RedirectButton>
        <PageTitle text="Sign Up" />
        <CredentialsForm
          usernameState={usernameState}
          passwordState={[password, setPassword]}
          errorTxt={signUpError}
          btnTxt="Sign Up"
          disabled={disableSignUp}
          onSubmit={doSignUp}
        />
        <div className="h-full my-auto flex flex-col justify-center items-center"></div>
      </div>
    </>
  );
}

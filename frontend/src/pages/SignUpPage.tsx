import { CredentialsForm } from "@src/components/authentication/CredentialsForm";
import PrimaryButton from "@src/components/buttons/PrimaryButton";
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
    return () => {
      setUsername("");
    };
  }, []);

  function doSignUp() {
    if (disableSignUp) return;
    setDisableSignUp(true);

    setSignUpError("");
    signUp(password)
      .then((val) => {
        console.log("SignUp Response:", val);
      })
      .catch((err) => {
        console.error("Error in sign up! Error:", err);
        setSignUpError(err);
      })
      .finally(() => {
        setDisableSignUp(false);
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
        <PageTitle text="Sign Up" />
        <CredentialsForm
          usernameState={usernameState}
          passwordState={[password, setPassword]}
          errorTxt={signUpError}
          btnTxt="Sign Up"
          disabled={disableSignUp}
          onSubmit={doSignUp}
        />
      </div>
    </>
  );
}

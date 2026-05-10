import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { ErrorLabel } from "@src/components/ErrorLabel";
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
        <h1 className="text-3xl text-center">Sign Up</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            doSignUp();
          }}
        >
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
                className="text-2xl border-2 rounded-xl py-1 px-1"
                placeholder="Password"
                value={password}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
              ></input>
            </div>
          </div>
          <div className="mx-auto w-fit my-2">
            <ErrorLabel text={signUpError} />
          </div>
          <PrimaryButton
            btnType="submit"
            className="mx-auto text-2xl"
            disabled={disableSignUp}
          >
            Sign Up
          </PrimaryButton>
        </form>
      </div>
    </>
  );
}

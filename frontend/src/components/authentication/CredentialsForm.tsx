import { usePassedState } from "@src/hooks/usePassedState";
import { PassedState } from "@src/types/passed-state";
import { ErrorLabel } from "../ErrorLabel";
import PrimaryButton from "../buttons/PrimaryButton";
import { useState } from "react";
import clsx from "clsx";
import LoadingSpinner from "../LoadingSpinner";

export function CredentialsForm({
  usernameState,
  passwordState,
  errorTxt,
  btnTxt,
  disabled,
  onSubmit,
}: {
  usernameState: PassedState<string>;
  passwordState: PassedState<string>;
  errorTxt: string;
  btnTxt: string;
  disabled: boolean;
  onSubmit: () => void;
}) {
  const [username, setUsername] = usePassedState<string>(usernameState);
  const [password, setPassword] = usePassedState<string>(passwordState);
  const [hidePassword, setHidePassword] = useState<boolean>(true);

  const toggleHidePassword = () => setHidePassword((h) => !h);

  return (
    <>
      <div className="mx-auto w-fit my-2">
        <ErrorLabel text={errorTxt ?? " "} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="my-5 mx-auto w-1/2 py-5 flex gap-3 flex-col border-3 rounded-2xl">
          <div className="flex flex-col mx-auto gap-2 py-2">
            <div className="flex justify-start gap-3">
              <p className="text-3xl">Username:</p>
              <input
                className="text-2xl border-2 rounded-xl py-1 px-1"
                placeholder="Username"
                value={username}
                onChange={(e) => {
                  if (!disabled) setUsername(e.target.value);
                }}
              ></input>
            </div>
            <div className="flex justify-start gap-3">
              <p className="text-3xl">Password:</p>
              <div className="flex w-full gap-0.5">
                <input
                  className="text-2xl border-2 rounded-xl py-1 px-1"
                  placeholder="Password"
                  value={password}
                  type={hidePassword ? "password" : "text"}
                  onChange={(e) => {
                    if (!disabled) setPassword(e.target.value);
                  }}
                />
                <PrimaryButton
                  className="mx-1 w-20 text-xl bg-gray-500 hover:bg-gray-500/90 active:bg-gray-500/80"
                  onClick={toggleHidePassword}
                >
                  {hidePassword ? "Show" : "Hide"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
        <PrimaryButton
          btnType="submit"
          className="mx-auto text-3xl p-4 bg-blue-500/90 hover:bg-blue-500 active:bg-blue-600/90"
          disabled={disabled}
        >
          {btnTxt}
        </PrimaryButton>
        {disabled && <LoadingSpinner />}
      </form>
    </>
  );
}

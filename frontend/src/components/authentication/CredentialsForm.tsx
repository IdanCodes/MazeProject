import { usePassedState } from "@src/hooks/usePassedState";
import { PassedState } from "@src/types/passed-state";
import { ErrorLabel } from "../ErrorLabel";
import PrimaryButton from "../buttons/PrimaryButton";

export function CredentialsForm({
  usernameState,
  passwordState,
  errorTxt,
  disabled,
  onSubmit,
}: {
  usernameState: PassedState<string>;
  passwordState: PassedState<string>;
  errorTxt: string;
  disabled: boolean;
  onSubmit: () => void;
}) {
  const [username, setUsername] = usePassedState<string>(usernameState);
  const [password, setPassword] = usePassedState<string>(passwordState);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
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
          <ErrorLabel text={errorTxt} />
        </div>
        <PrimaryButton
          btnType="submit"
          className="mx-auto text-2xl"
          disabled={disabled}
        >
          Sign Up
        </PrimaryButton>
      </form>
    </>
  );
}

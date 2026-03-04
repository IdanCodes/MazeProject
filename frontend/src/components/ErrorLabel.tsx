import { JSX } from "react";

export function ErrorLabel({ text }: { text: string }): JSX.Element {
  return <p className="text-red-500 text-2xl">{text}</p>;
}

import React, { JSX, MouseEventHandler } from "react";
import clsx from "clsx";
import { ButtonSize } from "./ButtonSize";

export default function PrimaryButton({
  text = "",
  onClick = () => {},
  disabled = false,
  buttonSize = ButtonSize.Medium,
  btnType = "button",
  colors = {
    normal: "bg-gray-500",
    hover: "bg-gray-500/90",
    click: "bg-gray-600/90",
  },
}: {
  text?: string | number;
  onClick?: MouseEventHandler;
  disabled?: boolean;
  buttonSize?: ButtonSize;
  btnType?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  colors?: { normal: string; hover: string; click: string };
}): JSX.Element {
  return (
    <>
      <button
        className={clsx(
          `box-border flex scale-95 items-center justify-center rounded-xl p-3 transition-all duration-100 select-none ${colors.normal}`,
          disabled && "cursor-not-allowed opacity-70",
          !disabled &&
            `cursor-pointer hover:scale-100 hover:${colors.hover} active:${colors.click}`,
        )}
        type={btnType}
        disabled={disabled}
        onClick={(e) => {
          if (!disabled) onClick(e);
        }}
      >
        <p
          className={clsx(
            buttonSize == ButtonSize.Small && "text-2xl",
            buttonSize == ButtonSize.Medium && "m-0.5 text-3xl",
            buttonSize == ButtonSize.Large && "m-1 text-4xl",
          )}
        >
          {text}
        </p>
      </button>
    </>
  );
}

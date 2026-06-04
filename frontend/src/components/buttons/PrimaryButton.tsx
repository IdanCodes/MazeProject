import React, { JSX, MouseEventHandler } from "react";
import clsx from "clsx";
import { ButtonSize } from "./ButtonSize";
import { motion } from "motion/react";

export default function PrimaryButton({
  text = "",
  onClick = () => {},
  disabled = false,
  buttonSize = ButtonSize.Medium,
  btnType = "button",
  children,
  className = "",
}: {
  text?: string | number;
  onClick?: MouseEventHandler;
  disabled?: boolean;
  buttonSize?: ButtonSize;
  btnType?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  colors?: { normal: string; hover: string; click: string };
  children?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <>
      <motion.button
        className={clsx(
          `box-border flex scale-95 items-center justify-center rounded-xl p-3 transition-all duration-100 select-none`,
          `bg-[rgb(106,114,130)] hover:bg-[rgba(106,114,130,0.9)] active:bg-[rgba(74,85,101, 0.9)] `,
          disabled && "cursor-not-allowed opacity-70",
          !disabled && `cursor-pointer hover:scale-100`,
          className,
        )}
        type={btnType}
        disabled={disabled}
        onClick={(e) => {
          if (!disabled) onClick(e);
        }}
      >
        {children}
      </motion.button>
    </>
  );
}

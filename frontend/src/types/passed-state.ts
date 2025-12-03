import React from "react";

export type SetStateFunc<T> = React.Dispatch<React.SetStateAction<T>>;
export type PassedState<T> = [T, SetStateFunc<T>];

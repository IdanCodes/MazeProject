import React from "react";

export type PassedState<T> = [T, React.Dispatch<React.SetStateAction<T>>];

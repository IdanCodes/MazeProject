import React from "react";

function LoadingSpinner() {
  return (
    <div
      className="mx-auto my-4 size-20 animate-spin rounded-full border-7 border-blue-500 border-t-transparent"
      role="status"
    />
  );
}

export default LoadingSpinner;

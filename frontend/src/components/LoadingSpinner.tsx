import React from "react";

function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className={`mx-auto my-4 size-20 sianimate-spin rounded-full border-7 border-blue-500 border-t-transparent`}
      role="status"
    />
  );
}

export default LoadingSpinner;

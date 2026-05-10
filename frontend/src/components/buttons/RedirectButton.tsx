import { useNavigate } from "react-router-dom";
import PrimaryButton from "./PrimaryButton";

export function RedirectButton({
  path,
  children,
  className = "",
}: {
  path: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <PrimaryButton className={className} onClick={() => navigate(path)}>
      {children}
    </PrimaryButton>
  );
}

import { createPortal } from "react-dom";

const mountElement = document.getElementById("overlays")!;

function OverlayModal({
  closeModal = () => {},
  className = "bg-white p-6 rounded-lg",
  children = <></>,
}: {
  closeModal?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/30 flex justify-center items-center"
      onClick={(e) => {
        e.stopPropagation();
        closeModal();
      }}
    >
      <div className={className} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    mountElement,
  );
}

export default OverlayModal;

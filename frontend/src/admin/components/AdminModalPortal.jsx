import { createPortal } from "react-dom";

/** Render modal outside AdminLayout so fixed overlays always use the viewport. */
export default function AdminModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="admin-modal-portal">{children}</div>,
    document.body,
  );
}

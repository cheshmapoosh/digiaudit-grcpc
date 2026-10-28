import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bar, FlexBox } from "@ui5/webcomponents-react";
import "./modal-layout.css";

export function DialogFooterBar({ children, slot }: { children: ReactNode; slot?: string }) {
  return <Bar slot={slot} design="Footer" data-ui5-compact-size=""><FlexBox justifyContent="Center" alignItems="Center" className="modalFooterActions">{children}</FlexBox></Bar>;
}

/** Keep actions owned by their form while using the enclosing Dialog's native footer slot. */
export function DialogFooter({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<HTMLElement | null>(null);
  const bindAnchor = useCallback((element: HTMLDivElement | null) => {
    if (element) setDialog(element.closest<HTMLElement>("ui5-dialog"));
  }, []);
  return <><FlexBox ref={bindAnchor} style={{ display: "none" }} />{dialog ? createPortal(<DialogFooterBar slot="footer">{children}</DialogFooterBar>, dialog) : null}</>;
}

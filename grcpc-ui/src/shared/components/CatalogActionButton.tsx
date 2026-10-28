import { Button, type ButtonPropTypes } from "@ui5/webcomponents-react";
import "./catalog-actions.css";

/** Shared width for governance actions; icon-only controls retain their native size. */
export function CatalogActionButton({ className, children, ...props }: ButtonPropTypes) {
  return <Button {...props} className={[children ? "catalogActionButton" : "", className].filter(Boolean).join(" ")}>
    {children}
  </Button>;
}

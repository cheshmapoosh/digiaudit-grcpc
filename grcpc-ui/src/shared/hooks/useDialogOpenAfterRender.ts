import { useEffect, useState } from "react";
import { renderFinished } from "@ui5/webcomponents-base/dist/Render.js";

/** Let UI5 render the mounted dialog and its content before native centering runs. */
export function useDialogOpenAfterRender() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void renderFinished().then(() => {
      if (active) setOpen(true);
    });
    return () => { active = false; };
  }, []);

  return open;
}

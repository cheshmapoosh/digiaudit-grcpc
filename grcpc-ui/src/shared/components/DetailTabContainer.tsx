import type { ComponentProps } from "react";
import { Button, TabContainer } from "@ui5/webcomponents-react";

export type DetailTabContainerProps = ComponentProps<typeof TabContainer>;

export function DetailTabContainer({
    overflowButton,
    overflowMode = "End",
    startOverflowButton,
    ...props
}: DetailTabContainerProps) {
    return (
        <TabContainer
  {...props}
  overflowMode={overflowMode}
  overflowButton={
      overflowButton ?? (
<Button design="Transparent" tooltip="...">
    ...
</Button>
      )
  }
  startOverflowButton={
      startOverflowButton ?? (
<Button design="Transparent" tooltip="...">
    ...
</Button>
      )
  }
        />
    );
}

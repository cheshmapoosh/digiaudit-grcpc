import type { ComponentProps, CSSProperties } from "react";
import { Button, TabContainer } from "@ui5/webcomponents-react";

export type DetailTabContainerProps = ComponentProps<typeof TabContainer>;

const BASE_TAB_CONTAINER_STYLE: CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
};

function renderOverflowButton() {
    return (
        <Button
            design="Transparent"
            accessibleName="..."
            tooltip="..."
        >
            ...
        </Button>
    );
}

export function DetailTabContainer({
    collapsed = true,
    overflowButton,
    overflowMode = "End",
    startOverflowButton,
    style,
    ...props
}: DetailTabContainerProps) {
    const startOverflowProps =
        overflowMode === "StartAndEnd"
            ? { startOverflowButton: startOverflowButton ?? renderOverflowButton() }
            : {};

    return (
        <TabContainer
            {...props}
            // Detail panels live outside the tab strip so drafts stay mounted.
            // Collapse UI5's unused content area instead of rendering an empty band.
            collapsed={collapsed}
            style={{ ...BASE_TAB_CONTAINER_STYLE, ...style }}
            overflowMode={overflowMode}
            overflowButton={overflowButton ?? renderOverflowButton()}
            {...startOverflowProps}
        />
    );
}

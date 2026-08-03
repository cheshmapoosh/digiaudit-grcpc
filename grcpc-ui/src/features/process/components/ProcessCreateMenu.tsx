import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/theming/CustomStyle.js";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

import type { ProcessNodeType } from "../domain/process.model";

const DEFAULT_CREATE_NODE_TYPES: ProcessNodeType[] = ["PROCESS", "SUBPROCESS"];
const PROCESS_CREATE_MENU_BUTTON_CLASS = "process-create-menu-button";

addCustomCSS(
    "ui5-button",
    `
        :host(.${PROCESS_CREATE_MENU_BUTTON_CLASS}) .ui5-button-root {
            justify-content: flex-start;
        }

        :host(.${PROCESS_CREATE_MENU_BUTTON_CLASS}) .ui5-button-end-icon {
            margin-left: 0 !important;
            margin-inline-start: auto !important;
        }
    `,
);

const createMenuItemIdByNodeType: Record<ProcessNodeType, string> = {
    PROCESS: "process-create-menu-process",
    SUBPROCESS: "process-create-menu-subprocess",
};

const nodeTypeByMenuItemId: Record<string, ProcessNodeType> = {
    "process-create-menu-process": "PROCESS",
    "process-create-menu-subprocess": "SUBPROCESS",
};

type MenuItemClickEvent = {
    detail?: {
        item?: HTMLElement & {
            id?: string;
        };
    };
};

type ButtonClickEvent = {
    currentTarget?: EventTarget | null;
};

export interface ProcessCreateMenuProps {
    disabled?: boolean;
    style?: CSSProperties;
    nodeTypes?: ProcessNodeType[];
    onCreate: (nodeType: ProcessNodeType) => void;
}

function readClickedNodeType(event: unknown): ProcessNodeType | null {
    const itemId = (event as MenuItemClickEvent).detail?.item?.id;
    return itemId ? nodeTypeByMenuItemId[itemId] ?? null : null;
}

function readButtonElement(event: unknown): HTMLElement | undefined {
    const currentTarget = (event as ButtonClickEvent).currentTarget;
    return currentTarget instanceof HTMLElement ? currentTarget : undefined;
}

function canUsePortal(): boolean {
    return typeof document !== "undefined" && Boolean(document.body);
}

export default function ProcessCreateMenu({
    disabled = false,
    style,
    nodeTypes = DEFAULT_CREATE_NODE_TYPES,
    onCreate,
}: ProcessCreateMenuProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [opener, setOpener] = useState<HTMLElement | undefined>(undefined);

    const labels = useMemo<Record<ProcessNodeType, string>>(
        () => ({
            PROCESS: t("process.nodeType.process", { defaultValue: "فرآیند" }),
            SUBPROCESS: t("process.nodeType.subProcess", { defaultValue: "زیر فرآیند" }),
        }),
        [t],
    );

    const visibleNodeTypes = nodeTypes.length > 0 ? nodeTypes : DEFAULT_CREATE_NODE_TYPES;

    const menu = (
        <Menu
            open={open}
            opener={opener}
            placement="Bottom"
            horizontalAlign="End"
            onClose={() => setOpen(false)}
            onItemClick={(event) => {
                const nodeType = readClickedNodeType(event);

                if (!nodeType) {
                    return;
                }

                setOpen(false);
                onCreate(nodeType);
            }}
        >
            {visibleNodeTypes.map((nodeType) => (
                <MenuItem
                    key={nodeType}
                    id={createMenuItemIdByNodeType[nodeType]}
                    text={labels[nodeType]}
                />
            ))}
        </Menu>
    );

    return (
        <>
            <Button
                className={PROCESS_CREATE_MENU_BUTTON_CLASS}
                design="Emphasized"
                disabled={disabled}
                style={style}
                endIcon="slim-arrow-down"
                accessibilityAttributes={{
                    hasPopup: "menu",
                    expanded: open ? "true" : "false",
                }}
                onClick={(event) => {
                    if (disabled) {
                        return;
                    }

                    setOpener(readButtonElement(event));
                    setOpen(true);
                }}
            >
                {t("common.create", { defaultValue: "ایجاد" })}
            </Button>

            {canUsePortal() ? createPortal(menu, document.body) : null}
        </>
    );
}

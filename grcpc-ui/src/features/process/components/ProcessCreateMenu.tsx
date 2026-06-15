import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/theming/CustomStyle.js";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

import type { ProcessNodeType } from "../domain/process.model";

type CreateMenuAction =
    | { kind: "process"; nodeType: ProcessNodeType }
    | { kind: "control" };

const DEFAULT_CREATE_NODE_TYPES: ProcessNodeType[] = ["process", "subProcess"];
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

const CREATE_MENU_ACTIONS: Record<string, CreateMenuAction> = {
    "process-create-menu-process": { kind: "process", nodeType: "process" },
    "process-create-menu-sub-process": { kind: "process", nodeType: "subProcess" },
    "process-create-menu-control": { kind: "control" },
};

const createMenuItemIdByNodeType: Record<ProcessNodeType, string> = {
    process: "process-create-menu-process",
    subProcess: "process-create-menu-sub-process",
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
    onCreateProcess: (nodeType: ProcessNodeType) => void;
    onCreateControl: () => void;
}

function readClickedAction(event: unknown): CreateMenuAction | null {
    const itemId = (event as MenuItemClickEvent).detail?.item?.id;
    return itemId ? CREATE_MENU_ACTIONS[itemId] ?? null : null;
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
    onCreateProcess,
    onCreateControl,
}: ProcessCreateMenuProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [opener, setOpener] = useState<HTMLElement | undefined>(undefined);

    const labels = useMemo<Record<ProcessNodeType, string>>(
        () => ({
            process: t("process.nodeType.process", { defaultValue: "فرآیند" }),
            subProcess: t("process.nodeType.subProcess", { defaultValue: "زیر فرآیند" }),
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
                const action = readClickedAction(event);

                if (!action) {
                    return;
                }

                setOpen(false);

                if (action.kind === "process") {
                    onCreateProcess(action.nodeType);
                    return;
                }

                onCreateControl();
            }}
        >
            {visibleNodeTypes.map((nodeType) => (
                <MenuItem
                    key={nodeType}
                    id={createMenuItemIdByNodeType[nodeType]}
                    text={labels[nodeType]}
                />
            ))}
            <MenuItem
                id="process-create-menu-control"
                text={t("process.createMenu.control", { defaultValue: "کنترل" })}
            />
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

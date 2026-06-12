import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

import type { ProcessNodeType } from "../domain/process.model";

export type ProcessControlCreateAction = "createNew" | "attachExisting";

type CreateMenuAction =
    | { kind: "process"; nodeType: ProcessNodeType }
    | { kind: "control"; action: ProcessControlCreateAction };

const DEFAULT_CREATE_NODE_TYPES: ProcessNodeType[] = ["process", "subProcess"];

const CREATE_MENU_ACTIONS: Record<string, CreateMenuAction> = {
    "process-create-menu-process": { kind: "process", nodeType: "process" },
    "process-create-menu-sub-process": { kind: "process", nodeType: "subProcess" },
    "process-create-menu-control-create": { kind: "control", action: "createNew" },
    "process-create-menu-control-attach": { kind: "control", action: "attachExisting" },
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
    onCreateControl: (action: ProcessControlCreateAction) => void;
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
                setOpen(false);

                if (!action) {
                    return;
                }

                if (action.kind === "process") {
                    onCreateProcess(action.nodeType);
                    return;
                }

                onCreateControl(action.action);
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
                id="process-create-menu-control-create"
                text={t("process.createMenu.controlCreate", {
                    defaultValue: "کنترل - ایجاد",
                })}
            />
            <MenuItem
                id="process-create-menu-control-attach"
                text={t("process.createMenu.controlAttach", {
                    defaultValue: "کنترل - اتصال",
                })}
            />
        </Menu>
    );

    return (
        <>
            <Button
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

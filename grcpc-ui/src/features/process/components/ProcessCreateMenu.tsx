import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

import type { ProcessCreateType } from "../domain/processControl.model";

const DEFAULT_CREATE_NODE_TYPES: ProcessCreateType[] = ["PROCESS", "SUBPROCESS", "CONTROL"];


const createMenuItemIdByNodeType: Record<ProcessCreateType, string> = {
    PROCESS: "process-create-menu-process",
    SUBPROCESS: "process-create-menu-subprocess",
    CONTROL: "process-create-menu-control",
};

const nodeTypeByMenuItemId: Record<string, ProcessCreateType> = {
    "process-create-menu-process": "PROCESS",
    "process-create-menu-subprocess": "SUBPROCESS",
    "process-create-menu-control": "CONTROL",
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
    slot?: string;
    style?: CSSProperties;
    nodeTypes?: ProcessCreateType[];
    onCreate: (nodeType: ProcessCreateType) => void;
}

function readClickedNodeType(event: unknown): ProcessCreateType | null {
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
    slot,
    style,
    nodeTypes = DEFAULT_CREATE_NODE_TYPES,
    onCreate,
}: ProcessCreateMenuProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [opener, setOpener] = useState<HTMLElement | undefined>(undefined);

    const labels = useMemo<Record<ProcessCreateType, string>>(
        () => ({
            PROCESS: t("process.nodeType.process", { defaultValue: "فرآیند" }),
            SUBPROCESS: t("process.nodeType.subProcess", { defaultValue: "زیر فرآیند" }),
            CONTROL: t("control.nodeType.control"),
        }),
        [t],
    );
    const enabledNodeTypes = useMemo(() => new Set(nodeTypes), [nodeTypes]);
    const blocked = disabled || enabledNodeTypes.size === 0;

    const menu = (
        <Menu
            open={open}
            opener={opener}
            placement="Bottom"
            horizontalAlign="End"
            onClose={() => setOpen(false)}
            onItemClick={(event) => {
                const nodeType = readClickedNodeType(event);

                if (!nodeType || !enabledNodeTypes.has(nodeType)) {
                    return;
                }

                setOpen(false);
                onCreate(nodeType);
            }}
        >
            {DEFAULT_CREATE_NODE_TYPES.map((nodeType) => (
                <MenuItem
                    key={nodeType}
                    id={createMenuItemIdByNodeType[nodeType]}
                    text={labels[nodeType]}
                    disabled={!enabledNodeTypes.has(nodeType)}
                />
            ))}
        </Menu>
    );

    return (
        <>
            <Button
                slot={slot}
                className="createMenuButton"
                design="Emphasized"
                disabled={blocked}
                style={style}
                endIcon="slim-arrow-down"
                accessibilityAttributes={{
                    hasPopup: "menu",
                    expanded: open ? "true" : "false",
                }}
                onClick={(event) => {
                    if (blocked) {
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

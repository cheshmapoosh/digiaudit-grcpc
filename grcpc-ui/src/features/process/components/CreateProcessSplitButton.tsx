import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

import type { ProcessNodeType } from "../domain/process.model";

const DEFAULT_CREATE_NODE_TYPES: ProcessNodeType[] = ["process", "subProcess", "control"];

const createMenuItemIdByNodeType: Record<ProcessNodeType, string> = {
    process: "process-create-menu-process",
    subProcess: "process-create-menu-sub-process",
    control: "process-create-menu-control",
};

const nodeTypeByCreateMenuItemId: Record<string, ProcessNodeType> = {
    "process-create-menu-process": "process",
    "process-create-menu-sub-process": "subProcess",
    "process-create-menu-control": "control",
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

export interface CreateProcessSplitButtonProps {
    disabled?: boolean;
    style?: CSSProperties;
    nodeTypes?: ProcessNodeType[];
    onCreate: (nodeType: ProcessNodeType) => void;
}

function readClickedNodeType(event: unknown): ProcessNodeType | null {
    const itemId = (event as MenuItemClickEvent).detail?.item?.id;

    if (!itemId) {
        return null;
    }

    return nodeTypeByCreateMenuItemId[itemId] ?? null;
}

function readButtonElement(event: unknown): HTMLElement | undefined {
    const currentTarget = (event as ButtonClickEvent).currentTarget;

    if (currentTarget instanceof HTMLElement) {
        return currentTarget;
    }

    return undefined;
}

function canUsePortal(): boolean {
    return typeof document !== "undefined" && Boolean(document.body);
}

export default function CreateProcessSplitButton({
                                                     disabled = false,
                                                     style,
                                                     nodeTypes = DEFAULT_CREATE_NODE_TYPES,
                                                     onCreate,
                                                 }: CreateProcessSplitButtonProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [opener, setOpener] = useState<HTMLElement | undefined>(undefined);

    const labels = useMemo<Record<ProcessNodeType, string>>(
        () => ({
            process: t("process.nodeType.process", { defaultValue: "فرآیند" }),
            subProcess: t("process.nodeType.subProcess", { defaultValue: "زیر فرآیند" }),
            control: t("process.nodeType.control", { defaultValue: "کنترل" }),
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
                setOpen(false);

                if (nodeType) {
                    onCreate(nodeType);
                }
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
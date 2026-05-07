import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

import type { RegulationNodeType } from "../domain/regulation.model";

const DEFAULT_CREATE_NODE_TYPES: RegulationNodeType[] = [
    "lawGroup",
    "law",
    "lawRequirement",
];

const createMenuItemIdByNodeType: Record<RegulationNodeType, string> = {
    lawGroup: "regulation-create-menu-law-group",
    law: "regulation-create-menu-law",
    lawRequirement: "regulation-create-menu-law-requirement",
};

const nodeTypeByCreateMenuItemId: Record<string, RegulationNodeType> = {
    "regulation-create-menu-law-group": "lawGroup",
    "regulation-create-menu-law": "law",
    "regulation-create-menu-law-requirement": "lawRequirement",
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

export interface CreateRegulationSplitButtonProps {
    disabled?: boolean;
    style?: CSSProperties;
    nodeTypes?: RegulationNodeType[];
    onCreate: (nodeType: RegulationNodeType) => void;
}

function readClickedNodeType(event: unknown): RegulationNodeType | null {
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

export default function CreateRegulationSplitButton({
    disabled = false,
    style,
    nodeTypes = DEFAULT_CREATE_NODE_TYPES,
    onCreate,
}: CreateRegulationSplitButtonProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [opener, setOpener] = useState<HTMLElement | undefined>(undefined);

    const labels = useMemo<Record<RegulationNodeType, string>>(
        () => ({
            lawGroup: t("regulation.nodeType.lawGroup", {
                defaultValue: "گروه قانون",
            }),
            law: t("regulation.nodeType.law", { defaultValue: "قانون" }),
            lawRequirement: t("regulation.nodeType.lawRequirement", {
                defaultValue: "الزامات قانون",
            }),
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

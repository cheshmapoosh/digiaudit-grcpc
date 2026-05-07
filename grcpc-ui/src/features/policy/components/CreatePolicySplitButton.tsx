import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

import type { PolicyNodeType } from "../domain/policy.model";

const DEFAULT_CREATE_NODE_TYPES: PolicyNodeType[] = ["policyGroup", "policy"];

const createMenuItemIdByNodeType: Record<PolicyNodeType, string> = {
    policyGroup: "policy-create-menu-policy-group",
    policy: "policy-create-menu-policy",
};

const nodeTypeByCreateMenuItemId: Record<string, PolicyNodeType> = {
    "policy-create-menu-policy-group": "policyGroup",
    "policy-create-menu-policy": "policy",
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

export interface CreatePolicySplitButtonProps {
    disabled?: boolean;
    style?: CSSProperties;
    nodeTypes?: PolicyNodeType[];
    onCreate: (nodeType: PolicyNodeType) => void;
}

function readClickedNodeType(event: unknown): PolicyNodeType | null {
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

export default function CreatePolicySplitButton({
    disabled = false,
    style,
    nodeTypes = DEFAULT_CREATE_NODE_TYPES,
    onCreate,
}: CreatePolicySplitButtonProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [opener, setOpener] = useState<HTMLElement | undefined>(undefined);

    const labels = useMemo<Record<PolicyNodeType, string>>(
        () => ({
            policyGroup: t("policy.nodeType.policyGroup", { defaultValue: "گروه سیاست" }),
            policy: t("policy.nodeType.policy", { defaultValue: "سیاست" }),
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

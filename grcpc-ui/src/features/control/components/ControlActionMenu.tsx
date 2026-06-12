import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button, Menu, MenuItem } from "@ui5/webcomponents-react";

export type ControlCreateAction = "createNew" | "attachExisting";

const CREATE_NEW_ITEM_ID = "control-action-create-new";
const ATTACH_EXISTING_ITEM_ID = "control-action-attach-existing";

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

export interface ControlActionMenuProps {
    disabled?: boolean;
    style?: CSSProperties;
    onAction: (action: ControlCreateAction) => void;
}

function readClickedAction(event: unknown): ControlCreateAction | null {
    const itemId = (event as MenuItemClickEvent).detail?.item?.id;

    if (itemId === CREATE_NEW_ITEM_ID) {
        return "createNew";
    }

    if (itemId === ATTACH_EXISTING_ITEM_ID) {
        return "attachExisting";
    }

    return null;
}

function readButtonElement(event: unknown): HTMLElement | undefined {
    const currentTarget = (event as ButtonClickEvent).currentTarget;
    return currentTarget instanceof HTMLElement ? currentTarget : undefined;
}

function canUsePortal(): boolean {
    return typeof document !== "undefined" && Boolean(document.body);
}

export default function ControlActionMenu({
    disabled = false,
    style,
    onAction,
}: ControlActionMenuProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [opener, setOpener] = useState<HTMLElement | undefined>(undefined);

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

                if (action) {
                    onAction(action);
                }
            }}
        >
            <MenuItem
                id={CREATE_NEW_ITEM_ID}
                text={t("control.actions.createNew", {
                    defaultValue: "تعریف کنترل جدید",
                })}
            />
            <MenuItem
                id={ATTACH_EXISTING_ITEM_ID}
                text={t("control.actions.attachExisting", {
                    defaultValue: "اتصال کنترل موجود",
                })}
            />
        </Menu>
    );

    return (
        <>
            <Button
                design="Emphasized"
                disabled={disabled}
                endIcon="slim-arrow-down"
                style={style}
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
                {t("control.actions.addControl", { defaultValue: "+ کنترل" })}
            </Button>

            {canUsePortal() ? createPortal(menu, document.body) : null}
        </>
    );
}

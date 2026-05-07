import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@ui5/webcomponents-react";

import type { ObjectiveNodeType } from "../domain/objective.model";

export interface CreateObjectiveButtonProps {
    disabled?: boolean;
    style?: CSSProperties;
    onCreate: (nodeType: ObjectiveNodeType) => void;
}

export default function CreateObjectiveButton({
    disabled = false,
    style,
    onCreate,
}: CreateObjectiveButtonProps) {
    const { t } = useTranslation();

    return (
        <Button
            design="Emphasized"
            disabled={disabled}
            style={style}
            onClick={() => onCreate("objective")}
        >
            {t("common.create", { defaultValue: "ایجاد" })}
        </Button>
    );
}

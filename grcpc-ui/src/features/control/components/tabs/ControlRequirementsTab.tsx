import { useTranslation } from "react-i18next";

import { regulationService } from "@/features/regulation/service/regulation.service";
import type { ControlRequirementLink } from "../../domain/control.model";
import { controlService } from "../../service/control.service";
import ControlLinkTab, { type ControlCatalogOption } from "./ControlLinkTab";
import { displayText } from "./ControlTabUtils";

export interface ControlRequirementsTabProps {
    controlAssignmentId: string;
}

async function loadRequirementCatalog(): Promise<ControlCatalogOption[]> {
    const items = await regulationService.list();

    return items
        .filter((item) => item.nodeType === "lawRequirement")
        .map((item) => ({
            id: item.id,
            code: item.code,
            title: item.title,
            description: item.description,
        }));
}

function getRequirementId(item: ControlRequirementLink): string {
    return item.requirementId;
}

export default function ControlRequirementsTab({
    controlAssignmentId,
}: ControlRequirementsTabProps) {
    const { t } = useTranslation();

    return (
        <ControlLinkTab<ControlRequirementLink>
            controlAssignmentId={controlAssignmentId}
            title={t("control.tabs.requirements", { defaultValue: "Requirements" })}
            addText={t("control.actions.linkRequirement", { defaultValue: "Link Requirement" })}
            dialogTitle={t("control.requirements.linkTitle", {
                defaultValue: "Link Requirement",
            })}
            emptyText={t("control.empty.requirements", {
                defaultValue: "No requirements have been linked.",
            })}
            catalogLabel={t("control.fields.requirement", { defaultValue: "Requirement" })}
            catalogSearchPlaceholder={t("control.links.searchRequirements", {
                defaultValue: "Search requirements",
            })}
            catalogEmptyText={t("control.empty.requirementCatalog", {
                defaultValue: "No requirements are available.",
            })}
            listLinks={controlService.listRequirements}
            linkItem={controlService.linkRequirement}
            deleteLink={controlService.deleteRequirementLink}
            loadCatalog={loadRequirementCatalog}
            getLinkedReferenceId={getRequirementId}
            extraColumns={[
                {
                    key: "regulationTitle",
                    label: t("control.fields.regulation", { defaultValue: "Regulation" }),
                    render: (item) => displayText(item.regulationTitle),
                },
            ]}
        />
    );
}

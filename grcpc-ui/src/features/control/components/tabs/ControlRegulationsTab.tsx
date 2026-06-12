import { useTranslation } from "react-i18next";

import { regulationService } from "@/features/regulation/service/regulation.service";
import type { ControlRegulationLink } from "../../domain/control.model";
import { controlService } from "../../service/control.service";
import ControlLinkTab, { type ControlCatalogOption } from "./ControlLinkTab";

export interface ControlRegulationsTabProps {
    controlAssignmentId: string;
}

async function loadRegulationCatalog(): Promise<ControlCatalogOption[]> {
    const items = await regulationService.list();

    return items
        .filter((item) => item.nodeType === "law")
        .map((item) => ({
            id: item.id,
            code: item.code,
            title: item.title,
            description: item.description,
        }));
}

function getRegulationId(item: ControlRegulationLink): string {
    return item.regulationId;
}

export default function ControlRegulationsTab({
    controlAssignmentId,
}: ControlRegulationsTabProps) {
    const { t } = useTranslation();

    return (
        <ControlLinkTab<ControlRegulationLink>
            controlAssignmentId={controlAssignmentId}
            title={t("control.tabs.regulations", { defaultValue: "Regulations" })}
            addText={t("control.actions.linkRegulation", { defaultValue: "Link Regulation" })}
            dialogTitle={t("control.regulations.linkTitle", {
                defaultValue: "Link Regulation",
            })}
            emptyText={t("control.empty.regulations", {
                defaultValue: "No regulations have been linked.",
            })}
            catalogLabel={t("control.fields.regulation", { defaultValue: "Regulation" })}
            catalogSearchPlaceholder={t("control.links.searchRegulations", {
                defaultValue: "Search regulations",
            })}
            catalogEmptyText={t("control.empty.regulationCatalog", {
                defaultValue: "No regulations are available.",
            })}
            listLinks={controlService.listRegulations}
            linkItem={controlService.linkRegulation}
            deleteLink={controlService.deleteRegulationLink}
            loadCatalog={loadRegulationCatalog}
            getLinkedReferenceId={getRegulationId}
        />
    );
}

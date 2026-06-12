import { useTranslation } from "react-i18next";

import { riskService } from "@/features/risk/service/risk.service";
import type { ControlRiskLink } from "../../domain/control.model";
import { controlService } from "../../service/control.service";
import ControlLinkTab, { type ControlCatalogOption } from "./ControlLinkTab";
import { displayText } from "./ControlTabUtils";

export interface ControlRisksTabProps {
    controlAssignmentId: string;
}

async function loadRiskCatalog(): Promise<ControlCatalogOption[]> {
    const items = await riskService.list();

    return items
        .filter((item) => item.nodeType === "riskTemplate")
        .map((item) => ({
            id: item.id,
            code: item.code,
            title: item.title,
            description: item.description,
        }));
}

function getRiskId(item: ControlRiskLink): string {
    return item.riskId;
}

export default function ControlRisksTab({ controlAssignmentId }: ControlRisksTabProps) {
    const { t } = useTranslation();

    return (
        <ControlLinkTab<ControlRiskLink>
            controlAssignmentId={controlAssignmentId}
            title={t("control.tabs.risks", { defaultValue: "Risks" })}
            addText={t("control.actions.linkRisk", { defaultValue: "Link Risk" })}
            dialogTitle={t("control.risks.linkTitle", { defaultValue: "Link Risk" })}
            emptyText={t("control.empty.risks", {
                defaultValue: "No risks have been linked.",
            })}
            catalogLabel={t("control.fields.risk", { defaultValue: "Risk" })}
            catalogSearchPlaceholder={t("control.links.searchRisks", {
                defaultValue: "Search risks",
            })}
            catalogEmptyText={t("control.empty.riskCatalog", {
                defaultValue: "No risks are available.",
            })}
            listLinks={controlService.listRisks}
            linkItem={controlService.linkRisk}
            deleteLink={controlService.deleteRiskLink}
            loadCatalog={loadRiskCatalog}
            getLinkedReferenceId={getRiskId}
            extraColumns={[
                {
                    key: "source",
                    label: t("control.fields.source", { defaultValue: "Source" }),
                    render: (item) => displayText(item.source),
                },
                {
                    key: "organizationTitle",
                    label: t("control.fields.organizationTitle", {
                        defaultValue: "Organization",
                    }),
                    render: (item) => displayText(item.organizationTitle),
                },
            ]}
        />
    );
}

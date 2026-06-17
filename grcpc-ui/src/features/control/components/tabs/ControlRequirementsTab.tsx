import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { regulationService } from "@/features/regulation/service/regulation.service";
import type { ControlRequirementLink } from "../../domain/control.model";
import { controlService } from "../../service/control.service";
import ControlLinkTab, { type ControlCatalogOption } from "./ControlLinkTab";
import {
    ControlTabShell,
    ControlTable,
} from "./ControlTabPrimitives";
import {
    displayDate,
    displayText,
    mapControlTabError,
} from "./ControlTabUtils";

export interface ControlRequirementsTabProps {
    controlAssignmentId: string;
    readOnly?: boolean;
    showActions?: boolean;
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

function formatValidity(validFrom?: string | null, validTo?: string | null): string {
    if (!validFrom && !validTo) {
        return "-";
    }

    return `${displayDate(validFrom)} - ${displayDate(validTo)}`;
}

export default function ControlRequirementsTab({
    controlAssignmentId,
    readOnly = false,
    showActions = true,
}: ControlRequirementsTabProps) {
    const { t } = useTranslation();
    const [items, setItems] = useState<ControlRequirementLink[]>([]);
    const [loading, setLoading] = useState(!showActions || readOnly);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (showActions && !readOnly) {
            return undefined;
        }

        let active = true;
        setLoading(true);
        setError(null);
        setItems([]);

        void controlService
            .listRequirements(controlAssignmentId)
            .then((loadedItems) => {
                if (active) {
                    setItems(loadedItems);
                }
            })
            .catch((loadError: unknown) => {
                if (active) {
                    setError(
                        mapControlTabError(
                            loadError,
                            t("control.requirements.loadError", {
                                defaultValue: "خطا در بارگذاری الزامات کنترل.",
                            }),
                        ),
                    );
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [controlAssignmentId, readOnly, showActions, t]);

    if (showActions && !readOnly) {
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

    return (
        <ControlTabShell
            title={t("control.requirements.title", { defaultValue: "الزامات" })}
            loading={loading}
            error={error}
            onErrorClose={() => setError(null)}
            hideErrorCloseButton={!showActions}
            empty={!items.length}
        >
            {!items.length ? (
                t("control.empty.requirements", {
                    defaultValue: "الزامی به این کنترل متصل نشده است.",
                })
            ) : (
                <ControlTable
                    items={items}
                    accessibleName={t("control.requirements.tableAccessibleName", {
                        defaultValue: "جدول الزامات کنترل",
                    })}
                    columns={[
                        {
                            key: "code",
                            label: t("control.requirements.columns.code", { defaultValue: "کد" }),
                            render: (item) => displayText(item.code),
                        },
                        {
                            key: "title",
                            label: t("control.requirements.columns.title", { defaultValue: "عنوان" }),
                            render: (item) => displayText(item.title),
                        },
                        {
                            key: "description",
                            label: t("control.requirements.columns.description", { defaultValue: "شرح" }),
                            render: (item) => displayText(item.description),
                        },
                        {
                            key: "regulationTitle",
                            label: t("control.requirements.columns.regulationTitle", {
                                defaultValue: "قانون",
                            }),
                            render: (item) => displayText(item.regulationTitle),
                        },
                        {
                            key: "validity",
                            label: t("control.requirements.columns.validity", { defaultValue: "اعتبار" }),
                            render: (item) => formatValidity(item.validFrom, item.validTo),
                        },
                    ]}
                />
            )}
        </ControlTabShell>
    );
}

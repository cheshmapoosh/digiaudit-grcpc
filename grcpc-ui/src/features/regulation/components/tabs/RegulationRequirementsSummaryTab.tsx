import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
    BusyIndicator,
    MessageStrip,
    Table,
    TableCell,
    TableHeaderCell,
    TableHeaderRow,
    TableRow,
    Text,
} from "@ui5/webcomponents-react";

import type { RegulationNode, RegulationStatus } from "../../domain/regulation.model";
import { regulationService } from "../../service/regulation.service";
import { formatPersianDate } from "@/shared/utils/date.utils";

export interface RegulationRequirementsSummaryTabProps {
    lawId: string;
}

type LoadState = "loading" | "success" | "error";

const PANEL_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.75rem",
};

const LOADING_STYLE: CSSProperties = {
    display: "grid",
    minHeight: "10rem",
    placeItems: "center",
};

function displayText(value?: string | number | null): string {
    if (typeof value === "number") {
        return String(value);
    }

    return value?.trim() ? value : "-";
}

function displayDate(value?: string | null): string {
    return value ? formatPersianDate(value) : "-";
}

function resolveStatusLabel(
    status: RegulationStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
}

function mapLoadError(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

export default function RegulationRequirementsSummaryTab({
    lawId,
}: RegulationRequirementsSummaryTabProps) {
    const { t } = useTranslation();
    const [items, setItems] = useState<RegulationNode[]>([]);
    const [loadState, setLoadState] = useState<LoadState>("loading");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        void regulationService
            .listChildren(lawId)
            .then((children) => {
                if (!active) {
                    return;
                }

                setItems(children.filter((child) => child.nodeType === "lawRequirement"));
                setError(null);
                setLoadState("success");
            })
            .catch((loadError: unknown) => {
                if (!active) {
                    return;
                }

                setError(
                    mapLoadError(
                        loadError,
                        t("regulation.requirements.loadError", {
                            defaultValue: "خطا در بارگذاری الزامات قانون",
                        }),
                    ),
                );
                setLoadState("error");
            });

        return () => {
            active = false;
        };
    }, [lawId, t]);

    if (loadState === "loading") {
        return (
            <div style={LOADING_STYLE}>
                <BusyIndicator active delay={0} />
            </div>
        );
    }

    if (loadState === "error") {
        return (
            <MessageStrip design="Negative" hideCloseButton>
                {error}
            </MessageStrip>
        );
    }

    if (items.length === 0) {
        return (
            <Text>
                {t("regulation.requirements.empty", {
                    defaultValue: "الزامی برای این قانون ثبت نشده است.",
                })}
            </Text>
        );
    }

    return (
        <div style={PANEL_STYLE}>
            <Table
                accessibleName={t("regulation.requirements.title", {
                    defaultValue: "الزامات قانون",
                })}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell width="8rem">
                            {t("regulation.requirements.columns.code", {
                                defaultValue: "شناسه",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("regulation.requirements.columns.title", {
                                defaultValue: "نام الزام",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="14rem">
                            {t("regulation.requirements.columns.description", {
                                defaultValue: "شرح",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="9rem">
                            {t("regulation.requirements.columns.status", {
                                defaultValue: "وضعیت",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="10rem">
                            {t("regulation.requirements.columns.effectiveDate", {
                                defaultValue: "تاریخ ایجاد",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="10rem">
                            {t("regulation.requirements.columns.validTo", {
                                defaultValue: "تاریخ اعتبار",
                            })}
                        </TableHeaderCell>
                    </TableHeaderRow>
                }
                noDataText={t("regulation.requirements.empty", {
                    defaultValue: "الزامی برای این قانون ثبت نشده است.",
                })}
                overflowMode="Popin"
            >
                {items.map((item) => (
                    <TableRow key={item.id} rowKey={item.id}>
                        <TableCell>{displayText(item.code)}</TableCell>
                        <TableCell>{displayText(item.title)}</TableCell>
                        <TableCell>{displayText(item.description)}</TableCell>
                        <TableCell>{resolveStatusLabel(item.status, t)}</TableCell>
                        <TableCell>{displayDate(item.effectiveDate)}</TableCell>
                        <TableCell>{displayDate(item.validTo)}</TableCell>
                    </TableRow>
                ))}
            </Table>
        </div>
    );
}

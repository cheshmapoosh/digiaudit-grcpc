import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    ComboBox,
    ComboBoxItem,
    MessageStrip,
    Table,
    TableCell,
    TableHeaderCell,
    TableHeaderRow,
    TableRow,
    Title,
} from "@ui5/webcomponents-react";

import type { RiskNode } from "@/features/risk/domain/risk.model";
import { riskService } from "@/features/risk/service/risk.service";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import type { ControlRiskLink } from "../../domain/control.model";
import { controlService } from "../../service/control.service";
import { displayDate } from "./ControlTabUtils";

export interface ControlRisksTabProps {
    controlAssignmentId: string;
    readOnly?: boolean;
    showActions?: boolean;
}

type RisksLoadStatus = "loading" | "success" | "error";

interface RisksLoadState {
    controlAssignmentId: string;
    retryKey: number;
    status: RisksLoadStatus;
    links: ControlRiskLink[];
    riskOptions: RiskNode[];
}

const PANEL_STYLE: CSSProperties = {
    display: "grid",
    gap: "0.75rem",
};

const ADD_TOOLBAR_STYLE: CSSProperties = {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
};

const RISK_COMBOBOX_STYLE: CSSProperties = {
    width: "min(28rem, 100%)",
    minWidth: "18rem",
};

const EMPTY_LINKS: ControlRiskLink[] = [];
const EMPTY_RISK_OPTIONS: RiskNode[] = [];

function initialLoadState(controlAssignmentId: string): RisksLoadState {
    return {
        controlAssignmentId,
        retryKey: 0,
        status: "loading",
        links: [],
        riskOptions: [],
    };
}

function formatOptionalValue(value: string | null | undefined, fallback: string): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
}

function formatRiskOption(risk: RiskNode, fallback: string): string {
    return `${formatOptionalValue(risk.code, fallback)} - ${formatOptionalValue(
        risk.title,
        fallback,
    )}`;
}

function formatLinkOption(link: ControlRiskLink, fallback: string): string {
    return `${formatOptionalValue(link.code, fallback)} - ${formatOptionalValue(
        link.title,
        fallback,
    )}`;
}

function readInputValue(event: unknown): string {
    return (event as { target?: { value?: string } }).target?.value ?? "";
}

function readSelectedComboBoxDataValue(event: unknown, fallback: string): string {
    const selectedItem = (event as {
        detail?: {
            item?: {
                getAttribute?: (name: string) => string | null;
            };
        };
    }).detail?.item;

    return selectedItem?.getAttribute?.("data-value") ?? fallback;
}

export default function ControlRisksTab({
    controlAssignmentId,
    readOnly = false,
    showActions = true,
}: ControlRisksTabProps) {
    const { t } = useTranslation();
    const canEdit = showActions && !readOnly;
    const requestSeq = useRef(0);
    const [retryKey, setRetryKey] = useState(0);
    const [selectedRiskId, setSelectedRiskId] = useState("");
    const [selectedRiskSearchValue, setSelectedRiskSearchValue] = useState("");
    const [mutationBusy, setMutationBusy] = useState(false);
    const [mutationError, setMutationError] = useState<string | null>(null);
    const [removeCandidate, setRemoveCandidate] = useState<ControlRiskLink | null>(null);
    const [loadState, setLoadState] = useState<RisksLoadState>(() =>
        initialLoadState(controlAssignmentId),
    );

    useEffect(() => {
        const requestId = requestSeq.current + 1;
        requestSeq.current = requestId;

        const shouldLoadCatalog = canEdit;

        Promise.all([
            controlService.listRisks(controlAssignmentId),
            shouldLoadCatalog ? riskService.list() : Promise.resolve([]),
        ])
            .then(([links, riskOptions]) => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    controlAssignmentId,
                    retryKey,
                    status: "success",
                    links,
                    riskOptions: riskOptions.filter((risk) => risk.nodeType === "riskTemplate"),
                });
                setRemoveCandidate(null);
                setMutationError(null);
            })
            .catch(() => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    controlAssignmentId,
                    retryKey,
                    status: "error",
                    links: [],
                    riskOptions: [],
                });
            });

        return () => {
            if (requestSeq.current === requestId) {
                requestSeq.current += 1;
            }
        };
    }, [canEdit, controlAssignmentId, retryKey]);

    const noneText = t("common.none", { defaultValue: "ندارد" });
    const duplicateMessage = t("control.risks.duplicate", {
        defaultValue: "این ریسک قبلاً افزوده شده است.",
    });
    const mutationErrorFallback = t("control.risks.mutationError", {
        defaultValue: "خطا در ذخیره تغییرات ریسک‌ها.",
    });
    const isCurrentLoad =
        loadState.controlAssignmentId === controlAssignmentId &&
        loadState.retryKey === retryKey;
    const links = isCurrentLoad ? loadState.links : EMPTY_LINKS;
    const riskOptions = isCurrentLoad ? loadState.riskOptions : EMPTY_RISK_OPTIONS;
    const isLoading =
        loadState.controlAssignmentId !== controlAssignmentId ||
        loadState.retryKey !== retryKey ||
        loadState.status === "loading";
    const hasError =
        !isLoading &&
        loadState.controlAssignmentId === controlAssignmentId &&
        loadState.retryKey === retryKey &&
        loadState.status === "error";
    const addedRiskIds = useMemo(
        () => new Set(links.map((link) => link.riskId)),
        [links],
    );
    const availableRisks = useMemo(
        () => riskOptions.filter((risk) => !addedRiskIds.has(risk.id)),
        [addedRiskIds, riskOptions],
    );
    const selectedRisk = availableRisks.find((risk) => risk.id === selectedRiskId);
    const riskComboBoxValue = selectedRisk
        ? formatRiskOption(selectedRisk, noneText)
        : selectedRiskSearchValue;
    const removeCandidateLabel = removeCandidate
        ? formatLinkOption(removeCandidate, noneText)
        : "";
    const canAdd =
        canEdit &&
        !!selectedRiskId &&
        availableRisks.some((risk) => risk.id === selectedRiskId) &&
        !isLoading &&
        !mutationBusy;

    const refresh = () => setRetryKey((current) => current + 1);

    const handleAdd = async () => {
        if (!canEdit || !selectedRiskId) {
            return;
        }

        if (addedRiskIds.has(selectedRiskId)) {
            setMutationError(duplicateMessage);
            return;
        }

        if (!canAdd) {
            return;
        }

        setMutationBusy(true);
        setMutationError(null);

        try {
            await controlService.linkRisk(controlAssignmentId, selectedRiskId);
            setSelectedRiskId("");
            setSelectedRiskSearchValue("");
            refresh();
        } catch {
            setMutationError(mutationErrorFallback);
        } finally {
            setMutationBusy(false);
        }
    };

    const handleRemove = async () => {
        if (!canEdit || !removeCandidate) {
            return;
        }

        setMutationBusy(true);
        setMutationError(null);

        try {
            await controlService.deleteRiskLink(controlAssignmentId, removeCandidate.id);
            setRemoveCandidate(null);
            refresh();
        } catch {
            setMutationError(mutationErrorFallback);
        } finally {
            setMutationBusy(false);
        }
    };

    if (hasError) {
        return (
            <div style={PANEL_STYLE}>
                <Title level="H5">{t("control.risks.title", { defaultValue: "ریسک‌ها" })}</Title>
                <MessageStrip design="Negative" hideCloseButton>
                    {t("control.risks.loadError", {
                        defaultValue: "خطا در بارگذاری ریسک‌ها.",
                    })}
                </MessageStrip>
                {showActions ? (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button design="Emphasized" disabled={isLoading} onClick={refresh}>
                            {t("control.risks.retry", { defaultValue: "تلاش دوباره" })}
                        </Button>
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div style={PANEL_STYLE}>
            <Title level="H5">{t("control.risks.title", { defaultValue: "ریسک‌ها" })}</Title>

            {canEdit ? (
                <div style={ADD_TOOLBAR_STYLE}>
                    <ComboBox
                        accessibleName={t("control.risks.addAccessibleName", {
                            defaultValue: "انتخاب ریسک برای افزودن",
                        })}
                        filter="Contains"
                        placeholder={t("control.risks.addPlaceholder", {
                            defaultValue: "انتخاب ریسک",
                        })}
                        showClearIcon
                        style={RISK_COMBOBOX_STYLE}
                        value={riskComboBoxValue}
                        disabled={isLoading || mutationBusy || availableRisks.length === 0}
                        onInput={(event) => {
                            const nextValue = readInputValue(event);
                            setSelectedRiskSearchValue(nextValue);

                            const matchedOption = availableRisks.find(
                                (risk) => formatRiskOption(risk, noneText) === nextValue,
                            );
                            setSelectedRiskId(matchedOption?.id ?? "");
                        }}
                        onSelectionChange={(event) => {
                            const nextValue = readSelectedComboBoxDataValue(event, selectedRiskId);
                            const selectedOption = availableRisks.find(
                                (risk) => risk.id === nextValue,
                            );

                            setSelectedRiskId(nextValue);
                            setSelectedRiskSearchValue(
                                selectedOption ? formatRiskOption(selectedOption, noneText) : "",
                            );
                        }}
                    >
                        {availableRisks.map((risk) => (
                            <ComboBoxItem
                                key={risk.id}
                                data-value={risk.id}
                                text={formatRiskOption(risk, noneText)}
                            />
                        ))}
                    </ComboBox>

                    <Button design="Emphasized" disabled={!canAdd} onClick={handleAdd}>
                        {t("control.risks.add", { defaultValue: "افزودن" })}
                    </Button>
                </div>
            ) : null}

            {canEdit && availableRisks.length === 0 && !isLoading ? (
                <MessageStrip design="Information" hideCloseButton>
                    {t("control.risks.noAssignable", {
                        defaultValue: "ریسک قابل افزودن دیگری وجود ندارد.",
                    })}
                </MessageStrip>
            ) : null}

            {mutationError ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {mutationError}
                </MessageStrip>
            ) : null}

            <Table
                accessibleName={t("control.risks.tableAccessibleName", {
                    defaultValue: "جدول ریسک‌های کنترل",
                })}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell width="8rem">
                            {t("control.risks.columns.code", { defaultValue: "کد" })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("control.risks.columns.title", { defaultValue: "نام ریسک" })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="14rem">
                            {t("control.risks.columns.description", { defaultValue: "شرح" })}
                        </TableHeaderCell>
                        <TableHeaderCell width="9rem">
                            {t("control.risks.columns.source", { defaultValue: "منبع" })}
                        </TableHeaderCell>
                        <TableHeaderCell width="10rem">
                            {t("control.risks.columns.organizationTitle", {
                                defaultValue: "سازمان",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="12rem">
                            {t("control.risks.columns.validity", { defaultValue: "اعتبار" })}
                        </TableHeaderCell>
                        {canEdit ? (
                            <TableHeaderCell width="8rem">
                                {t("control.risks.columns.actions", { defaultValue: "عملیات" })}
                            </TableHeaderCell>
                        ) : null}
                    </TableHeaderRow>
                }
                loading={isLoading}
                loadingDelay={0}
                noDataText={t("control.risks.empty", {
                    defaultValue: "ریسکی افزوده نشده است.",
                })}
                overflowMode="Popin"
            >
                {links.map((link) => (
                    <TableRow key={link.id} rowKey={link.id}>
                        <TableCell>{formatOptionalValue(link.code, noneText)}</TableCell>
                        <TableCell>{formatOptionalValue(link.title, noneText)}</TableCell>
                        <TableCell>{formatOptionalValue(link.description, noneText)}</TableCell>
                        <TableCell>{formatOptionalValue(link.source, noneText)}</TableCell>
                        <TableCell>
                            {formatOptionalValue(link.organizationTitle, noneText)}
                        </TableCell>
                        <TableCell>
                            {`${displayDate(link.validFrom)} - ${displayDate(link.validTo)}`}
                        </TableCell>
                        {canEdit ? (
                            <TableCell>
                                <Button
                                    design="Transparent"
                                    disabled={mutationBusy}
                                    onClick={() => setRemoveCandidate(link)}
                                >
                                    {t("control.risks.remove", { defaultValue: "حذف" })}
                                </Button>
                            </TableCell>
                        ) : null}
                    </TableRow>
                ))}
            </Table>

            {canEdit ? (
                <DeleteConfirmDialog
                    open={!!removeCandidate}
                    title={t("control.risks.removeTitle", { defaultValue: "حذف ریسک" })}
                    message={t("control.risks.removeConfirm", {
                    defaultValue: "آیا از حذف ریسک «{{title}}» مطمئن هستید؟",
                    title: removeCandidateLabel,
                })}
                    loading={mutationBusy}
                    confirmText={t("control.risks.confirmRemove", { defaultValue: "حذف" })}
                    cancelText={t("control.risks.cancelRemove", { defaultValue: "انصراف" })}
                    onClose={() => {
                    if (!mutationBusy) {
                        setRemoveCandidate(null);
                    }
                }}
                    onConfirm={handleRemove}
                />
            ) : null}
        </div>
    );
}

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
import type { ProcessNodeType } from "../../domain/process.model";
import type { ProcessRiskAssignment } from "../../domain/process-risk-assignment.model";
import { processRiskAssignmentService } from "../../service/process-risk-assignment.service";

interface ProcessRisksTabProps {
    processId: string | null;
    nodeType: ProcessNodeType;
}

type RisksLoadStatus = "idle" | "loading" | "success" | "error";

interface RisksLoadState {
    processId: string | null;
    retryKey: number;
    status: RisksLoadStatus;
    assignments: ProcessRiskAssignment[];
    riskOptions: RiskNode[];
}

const TABLE_PANEL_STYLE: CSSProperties = {
    minHeight: "15rem",
    background: "var(--sapGroup_ContentBackground)",
    border: "1px solid var(--sapList_BorderColor)",
    padding: "1rem",
};

const ERROR_ACTION_STYLE: CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    paddingTop: "0.75rem",
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

const EMPTY_ASSIGNMENTS: ProcessRiskAssignment[] = [];
const EMPTY_RISK_OPTIONS: RiskNode[] = [];

function initialLoadState(processId: string | null): RisksLoadState {
    return {
        processId,
        retryKey: 0,
        status: processId ? "loading" : "idle",
        assignments: [],
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

function formatAssignmentOption(
    assignment: ProcessRiskAssignment,
    fallback: string,
): string {
    return `${formatOptionalValue(assignment.code, fallback)} - ${formatOptionalValue(
        assignment.title,
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

function resolveRiskTypeLabel(
    riskType: string | null | undefined,
    fallback: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const normalized = riskType?.trim();

    if (!normalized) {
        return fallback;
    }

    const labels: Record<string, string> = {
        operational: t("process.risks.riskTypes.operational", { defaultValue: "عملیاتی" }),
        financial: t("process.risks.riskTypes.financial", { defaultValue: "مالی" }),
        strategic: t("process.risks.riskTypes.strategic", { defaultValue: "راهبردی" }),
        compliance: t("process.risks.riskTypes.compliance", { defaultValue: "انطباق" }),
        technology: t("process.risks.riskTypes.technology", { defaultValue: "فناوری" }),
        reputation: t("process.risks.riskTypes.reputation", { defaultValue: "شهرت" }),
        safety: t("process.risks.riskTypes.safety", { defaultValue: "ایمنی" }),
        other: t("process.risks.riskTypes.other", { defaultValue: "سایر" }),
    };

    return labels[normalized] ?? normalized;
}

function resolveStatusLabel(
    status: ProcessRiskAssignment["status"],
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("process.status.active", { defaultValue: "فعال" })
        : t("process.status.inactive", { defaultValue: "غیرفعال" });
}

export default function ProcessRisksTab({ processId, nodeType }: ProcessRisksTabProps) {
    const { t } = useTranslation();
    const requestSeq = useRef(0);
    const [retryKey, setRetryKey] = useState(0);
    const [selectedRiskId, setSelectedRiskId] = useState("");
    const [selectedRiskSearchValue, setSelectedRiskSearchValue] = useState("");
    const [mutationBusy, setMutationBusy] = useState(false);
    const [mutationError, setMutationError] = useState<string | null>(null);
    const [removeCandidate, setRemoveCandidate] =
        useState<ProcessRiskAssignment | null>(null);
    const [loadState, setLoadState] = useState<RisksLoadState>(() =>
        initialLoadState(processId),
    );

    useEffect(() => {
        if (!processId) {
            setLoadState(initialLoadState(null));
            setRemoveCandidate(null);
            setSelectedRiskId("");
            setSelectedRiskSearchValue("");
            return;
        }

        const requestId = requestSeq.current + 1;
        requestSeq.current = requestId;

        Promise.all([
            processRiskAssignmentService.listByProcess(processId),
            riskService.list(),
        ])
            .then(([assignments, riskOptions]) => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    processId,
                    retryKey,
                    status: "success",
                    assignments,
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
                    processId,
                    retryKey,
                    status: "error",
                    assignments: [],
                    riskOptions: [],
                });
            });

        return () => {
            if (requestSeq.current === requestId) {
                requestSeq.current += 1;
            }
        };
    }, [processId, retryKey]);

    const noneText = t("common.none", { defaultValue: "ندارد" });
    const risksTitle = t("process.risks.title", { defaultValue: "ریسک‌ها" });
    const duplicateMessage = t("process.risks.duplicate", {
        defaultValue: "این ریسک قبلاً برای این آیتم افزوده شده است.",
    });
    const mutationErrorFallback = t("process.risks.mutationError", {
        defaultValue: "خطا در ذخیره تغییرات ریسک‌ها.",
    });
    const isCurrentLoad =
        loadState.processId === processId && loadState.retryKey === retryKey;
    const assignments = isCurrentLoad ? loadState.assignments : EMPTY_ASSIGNMENTS;
    const riskOptions = isCurrentLoad ? loadState.riskOptions : EMPTY_RISK_OPTIONS;
    const isLoading =
        !!processId &&
        (loadState.processId !== processId ||
            loadState.retryKey !== retryKey ||
            loadState.status === "loading");
    const hasError =
        !!processId &&
        !isLoading &&
        loadState.processId === processId &&
        loadState.retryKey === retryKey &&
        loadState.status === "error";
    const addedRiskIds = useMemo(
        () => new Set(assignments.map((assignment) => assignment.riskNodeId)),
        [assignments],
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
        ? formatAssignmentOption(removeCandidate, noneText)
        : "";
    const canAdd =
        !!processId &&
        !!selectedRiskId &&
        availableRisks.some((risk) => risk.id === selectedRiskId) &&
        !isLoading &&
        !mutationBusy;
    const saveFirstMessage =
        nodeType === "subProcess"
            ? t("process.risks.saveFirst", {
                  defaultValue: "ابتدا آیتم فرآیندی را ذخیره کنید.",
              })
            : t("process.risks.saveFirst", {
                  defaultValue: "ابتدا آیتم فرآیندی را ذخیره کنید.",
              });

    const refresh = () => setRetryKey((current) => current + 1);

    const handleAdd = async () => {
        if (!processId || !selectedRiskId) {
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
            await processRiskAssignmentService.create({
                processNodeId: processId,
                riskNodeId: selectedRiskId,
                assignmentType: "scope",
                isActive: true,
            });
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
        if (!removeCandidate) {
            return;
        }

        setMutationBusy(true);
        setMutationError(null);

        try {
            await processRiskAssignmentService.remove(removeCandidate.assignmentId);
            setRemoveCandidate(null);
            refresh();
        } catch {
            setMutationError(mutationErrorFallback);
        } finally {
            setMutationBusy(false);
        }
    };

    if (!processId) {
        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">{risksTitle}</Title>

                <div style={{ height: "0.75rem" }} />

                <MessageStrip design="Information" hideCloseButton>
                    {saveFirstMessage}
                </MessageStrip>
            </div>
        );
    }

    if (hasError) {
        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">{risksTitle}</Title>

                <div style={{ height: "0.75rem" }} />

                <MessageStrip design="Negative" hideCloseButton>
                    {t("process.risks.loadError", {
                        defaultValue: "خطا در بارگذاری ریسک‌های افزوده‌شده.",
                    })}
                </MessageStrip>

                <div style={ERROR_ACTION_STYLE}>
                    <Button design="Emphasized" disabled={isLoading} onClick={refresh}>
                        {t("process.risks.retry", { defaultValue: "تلاش دوباره" })}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={TABLE_PANEL_STYLE}>
            <Title level="H5">{risksTitle}</Title>

            <div style={{ height: "0.75rem" }} />

            <div style={ADD_TOOLBAR_STYLE}>
                <ComboBox
                    accessibleName={t("process.risks.addAccessibleName", {
                        defaultValue: "انتخاب ریسک برای افزودن",
                    })}
                    filter="Contains"
                    placeholder={t("process.risks.addPlaceholder", {
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
                    {t("process.risks.add", { defaultValue: "افزودن" })}
                </Button>
            </div>

            {availableRisks.length === 0 && !isLoading ? (
                <>
                    <div style={{ height: "0.75rem" }} />
                    <MessageStrip design="Information" hideCloseButton>
                        {t("process.risks.noAssignable", {
                            defaultValue: "ریسک قابل افزودن دیگری وجود ندارد.",
                        })}
                    </MessageStrip>
                </>
            ) : null}

            {mutationError ? (
                <>
                    <div style={{ height: "0.75rem" }} />
                    <MessageStrip design="Negative" hideCloseButton>
                        {mutationError}
                    </MessageStrip>
                </>
            ) : null}

            <div style={{ height: "0.75rem" }} />

            <Table
                accessibleName={t("process.risks.tableAccessibleName", {
                    defaultValue: "جدول ریسک‌های آیتم فرآیندی",
                })}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell width="8rem">
                            {t("process.risks.columns.code", { defaultValue: "کد" })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("process.risks.columns.title", {
                                defaultValue: "نام ریسک",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="14rem">
                            {t("process.risks.columns.description", {
                                defaultValue: "شرح",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.risks.columns.type", { defaultValue: "نوع" })}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.risks.columns.status", { defaultValue: "وضعیت" })}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.risks.columns.actions", { defaultValue: "عملیات" })}
                        </TableHeaderCell>
                    </TableHeaderRow>
                }
                loading={isLoading}
                loadingDelay={0}
                noDataText={t("process.risks.empty", {
                    defaultValue: "ریسکی برای این آیتم افزوده نشده است.",
                })}
                overflowMode="Popin"
            >
                {assignments.map((assignment) => (
                    <TableRow key={assignment.assignmentId} rowKey={assignment.assignmentId}>
                        <TableCell>{formatOptionalValue(assignment.code, noneText)}</TableCell>
                        <TableCell>{formatOptionalValue(assignment.title, noneText)}</TableCell>
                        <TableCell>
                            {formatOptionalValue(assignment.description, noneText)}
                        </TableCell>
                        <TableCell>
                            {resolveRiskTypeLabel(assignment.riskType, noneText, t)}
                        </TableCell>
                        <TableCell>{resolveStatusLabel(assignment.status, t)}</TableCell>
                        <TableCell>
                            <Button
                                design="Transparent"
                                disabled={mutationBusy}
                                onClick={() => setRemoveCandidate(assignment)}
                            >
                                {t("process.risks.remove", { defaultValue: "حذف" })}
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </Table>

            <DeleteConfirmDialog
                open={!!removeCandidate}
                title={t("process.risks.removeTitle", { defaultValue: "حذف ریسک" })}
                message={t("process.risks.removeConfirm", {
                    defaultValue: "آیا از حذف ریسک «{{title}}» از این آیتم مطمئن هستید؟",
                    title: removeCandidateLabel,
                })}
                loading={mutationBusy}
                confirmText={t("process.risks.confirmRemove", { defaultValue: "حذف" })}
                cancelText={t("process.risks.cancelRemove", { defaultValue: "انصراف" })}
                onClose={() => {
                    if (!mutationBusy) {
                        setRemoveCandidate(null);
                    }
                }}
                onConfirm={handleRemove}
            />
        </div>
    );
}

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

import type { RegulationNode } from "@/features/regulation/domain/regulation.model";
import { regulationService } from "@/features/regulation/service/regulation.service";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { HttpError } from "@/shared/infra/http.client";
import type { ProcessNodeType } from "../../domain/process.model";
import type { ProcessRegulationAssignment } from "../../domain/process-regulation-assignment.model";
import { processRegulationAssignmentService } from "../../service/process-regulation-assignment.service";

interface ProcessRegulationsTabProps {
    processId: string | null;
    nodeType: ProcessNodeType;
    readOnly?: boolean;
}

type RegulationsLoadStatus = "idle" | "loading" | "success" | "error";

interface RegulationsLoadState {
    processId: string | null;
    retryKey: number;
    status: RegulationsLoadStatus;
    assignments: ProcessRegulationAssignment[];
    regulationOptions: RegulationNode[];
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

const REGULATION_COMBOBOX_STYLE: CSSProperties = {
    width: "min(28rem, 100%)",
    minWidth: "18rem",
};

const EMPTY_ASSIGNMENTS: ProcessRegulationAssignment[] = [];
const EMPTY_REGULATION_OPTIONS: RegulationNode[] = [];

function initialLoadState(processId: string | null): RegulationsLoadState {
    return {
        processId,
        retryKey: 0,
        status: processId ? "loading" : "idle",
        assignments: [],
        regulationOptions: [],
    };
}

function formatOptionalValue(value: string | null | undefined, fallback: string): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
}

function formatLawOption(law: RegulationNode, fallback: string): string {
    return `${formatOptionalValue(law.code, fallback)} - ${formatOptionalValue(
        law.title,
        fallback,
    )}`;
}

function formatAssignmentOption(
    assignment: ProcessRegulationAssignment,
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

function formatValidity(
    assignment: ProcessRegulationAssignment,
    fallback: string,
): string {
    const validFrom = assignment.validFrom?.trim();
    const validTo = assignment.validTo?.trim();

    if (!validFrom && !validTo) {
        return fallback;
    }

    return `${validFrom || fallback} - ${validTo || fallback}`;
}

function resolveStatusLabel(
    status: ProcessRegulationAssignment["status"],
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "فعال" })
        : t("common.inactive", { defaultValue: "غیرفعال" });
}

function resolveMutationError(
    error: unknown,
    duplicateMessage: string,
    fallbackMessage: string,
): string {
    if (
        error instanceof HttpError &&
        (error.status === 409 || error.code === "MASTER_DATA_DUPLICATE_ASSIGNMENT")
    ) {
        return duplicateMessage;
    }

    return fallbackMessage;
}

export default function ProcessRegulationsTab({
    processId,
    nodeType,
    readOnly = false,
}: ProcessRegulationsTabProps) {
    const { t } = useTranslation();
    const requestSeq = useRef(0);
    const [retryKey, setRetryKey] = useState(0);
    const [selectedLawId, setSelectedLawId] = useState("");
    const [selectedLawSearchValue, setSelectedLawSearchValue] = useState("");
    const [mutationBusy, setMutationBusy] = useState(false);
    const [mutationError, setMutationError] = useState<string | null>(null);
    const [removeCandidate, setRemoveCandidate] =
        useState<ProcessRegulationAssignment | null>(null);
    const [loadState, setLoadState] = useState<RegulationsLoadState>(() =>
        initialLoadState(processId),
    );

    useEffect(() => {
        if (!processId) {
            setLoadState(initialLoadState(null));
            setRemoveCandidate(null);
            setSelectedLawId("");
            setSelectedLawSearchValue("");
            return;
        }

        const requestId = requestSeq.current + 1;
        requestSeq.current = requestId;

        Promise.all([
            processRegulationAssignmentService.listByProcess(processId),
            regulationService.list(),
        ])
            .then(([assignments, regulationOptions]) => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    processId,
                    retryKey,
                    status: "success",
                    assignments,
                    regulationOptions: regulationOptions.filter(
                        (regulation) => regulation.nodeType === "law",
                    ),
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
                    regulationOptions: [],
                });
            });

        return () => {
            if (requestSeq.current === requestId) {
                requestSeq.current += 1;
            }
        };
    }, [processId, retryKey]);

    const noneText = t("common.none", { defaultValue: "ندارد" });
    const regulationsTitle = t("process.regulations.title", {
        defaultValue: "قوانین",
    });
    const duplicateMessage = t("process.regulations.duplicate", {
        defaultValue: "این قانون قبلاً برای این آیتم افزوده شده است.",
    });
    const mutationErrorFallback = t("process.regulations.mutationError", {
        defaultValue: "خطا در ذخیره تغییرات قوانین.",
    });
    const saveFirstMessage =
        nodeType === "subProcess"
            ? t("process.regulations.saveFirst", {
                  defaultValue: "ابتدا آیتم فرآیندی را ذخیره کنید.",
              })
            : t("process.regulations.saveFirst", {
                  defaultValue: "ابتدا آیتم فرآیندی را ذخیره کنید.",
              });
    const isCurrentLoad =
        loadState.processId === processId && loadState.retryKey === retryKey;
    const assignments = isCurrentLoad ? loadState.assignments : EMPTY_ASSIGNMENTS;
    const regulationOptions = isCurrentLoad
        ? loadState.regulationOptions
        : EMPTY_REGULATION_OPTIONS;
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
    const addedLawIds = useMemo(
        () => new Set(assignments.map((assignment) => assignment.regulationNodeId)),
        [assignments],
    );
    const availableLaws = useMemo(
        () => regulationOptions.filter((regulation) => !addedLawIds.has(regulation.id)),
        [addedLawIds, regulationOptions],
    );
    const selectedLaw = availableLaws.find((law) => law.id === selectedLawId);
    const lawComboBoxValue = selectedLaw
        ? formatLawOption(selectedLaw, noneText)
        : selectedLawSearchValue;
    const removeCandidateLabel = removeCandidate
        ? formatAssignmentOption(removeCandidate, noneText)
        : "";
    const canAdd =
        !readOnly &&
        !!processId &&
        !!selectedLawId &&
        availableLaws.some((law) => law.id === selectedLawId) &&
        !isLoading &&
        !mutationBusy;

    const refresh = () => setRetryKey((current) => current + 1);

    const handleAdd = async () => {
        if (readOnly || !processId || !selectedLawId) {
            return;
        }

        if (addedLawIds.has(selectedLawId)) {
            setMutationError(duplicateMessage);
            return;
        }

        if (!canAdd) {
            return;
        }

        setMutationBusy(true);
        setMutationError(null);

        try {
            await processRegulationAssignmentService.create({
                processNodeId: processId,
                regulationNodeId: selectedLawId,
                isActive: true,
            });
            setSelectedLawId("");
            setSelectedLawSearchValue("");
            refresh();
        } catch (error) {
            setMutationError(
                resolveMutationError(error, duplicateMessage, mutationErrorFallback),
            );
        } finally {
            setMutationBusy(false);
        }
    };

    const handleRemove = async () => {
        if (readOnly || !removeCandidate) {
            return;
        }

        setMutationBusy(true);
        setMutationError(null);

        try {
            await processRegulationAssignmentService.remove(removeCandidate.assignmentId);
            setRemoveCandidate(null);
            refresh();
        } catch (error) {
            setMutationError(
                resolveMutationError(error, duplicateMessage, mutationErrorFallback),
            );
        } finally {
            setMutationBusy(false);
        }
    };

    if (!processId) {
        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">{regulationsTitle}</Title>

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
                <Title level="H5">{regulationsTitle}</Title>

                <div style={{ height: "0.75rem" }} />

                <MessageStrip design="Negative" hideCloseButton>
                    {t("process.regulations.loadError", {
                        defaultValue: "خطا در بارگذاری قوانین افزوده‌شده.",
                    })}
                </MessageStrip>

                <div style={ERROR_ACTION_STYLE}>
                    <Button design="Emphasized" disabled={isLoading} onClick={refresh}>
                        {t("process.regulations.retry", { defaultValue: "تلاش دوباره" })}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={TABLE_PANEL_STYLE}>
            <Title level="H5">{regulationsTitle}</Title>

            <div style={{ height: "0.75rem" }} />

            {!readOnly ? (
                <div style={ADD_TOOLBAR_STYLE}>
                    <ComboBox
                        accessibleName={t("process.regulations.addAccessibleName", {
                            defaultValue: "انتخاب قانون برای افزودن",
                        })}
                        filter="Contains"
                        placeholder={t("process.regulations.addPlaceholder", {
                            defaultValue: "انتخاب قانون",
                        })}
                        showClearIcon
                        style={REGULATION_COMBOBOX_STYLE}
                        value={lawComboBoxValue}
                        disabled={isLoading || mutationBusy || availableLaws.length === 0}
                        onInput={(event) => {
                            const nextValue = readInputValue(event);
                            setSelectedLawSearchValue(nextValue);

                            const matchedOption = availableLaws.find(
                                (law) => formatLawOption(law, noneText) === nextValue,
                            );
                            setSelectedLawId(matchedOption?.id ?? "");
                        }}
                        onSelectionChange={(event) => {
                            const nextValue = readSelectedComboBoxDataValue(event, selectedLawId);
                            const selectedOption = availableLaws.find(
                                (law) => law.id === nextValue,
                            );

                            setSelectedLawId(nextValue);
                            setSelectedLawSearchValue(
                                selectedOption ? formatLawOption(selectedOption, noneText) : "",
                            );
                        }}
                    >
                        {availableLaws.map((law) => (
                            <ComboBoxItem
                                key={law.id}
                                data-value={law.id}
                                text={formatLawOption(law, noneText)}
                            />
                        ))}
                    </ComboBox>

                    <Button design="Emphasized" disabled={!canAdd} onClick={handleAdd}>
                        {t("process.regulations.add", { defaultValue: "افزودن" })}
                    </Button>
                </div>
            ) : null}

            {availableLaws.length === 0 && !isLoading ? (
                <>
                    <div style={{ height: "0.75rem" }} />
                    <MessageStrip design="Information" hideCloseButton>
                        {t("process.regulations.noAssignable", {
                            defaultValue: "قانون قابل افزودن دیگری وجود ندارد.",
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
                accessibleName={t("process.regulations.tableAccessibleName", {
                    defaultValue: "جدول قوانین آیتم فرآیندی",
                })}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell width="8rem">
                            {t("process.regulations.columns.code", { defaultValue: "کد" })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("process.regulations.columns.title", {
                                defaultValue: "نام قانون",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="14rem">
                            {t("process.regulations.columns.description", {
                                defaultValue: "شرح",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="11rem">
                            {t("process.regulations.columns.issuer", {
                                defaultValue: "صادرکننده",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.regulations.columns.status", {
                                defaultValue: "وضعیت",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="12rem">
                            {t("process.regulations.columns.validity", {
                                defaultValue: "اعتبار",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.regulations.columns.actions", {
                                defaultValue: "عملیات",
                            })}
                        </TableHeaderCell>
                    </TableHeaderRow>
                }
                loading={isLoading}
                loadingDelay={0}
                noDataText={t("process.regulations.empty", {
                    defaultValue: "قانونی برای این آیتم افزوده نشده است.",
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
                        <TableCell>{formatOptionalValue(assignment.issuer, noneText)}</TableCell>
                        <TableCell>{resolveStatusLabel(assignment.status, t)}</TableCell>
                        <TableCell>{formatValidity(assignment, "-")}</TableCell>
                        <TableCell>
                            {!readOnly ? (
                                <Button
                                    design="Transparent"
                                    disabled={mutationBusy}
                                    onClick={() => setRemoveCandidate(assignment)}
                                >
                                    {t("process.regulations.remove", { defaultValue: "حذف" })}
                                </Button>
                            ) : (
                                noneText
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </Table>

            <DeleteConfirmDialog
                open={!!removeCandidate}
                title={t("process.regulations.removeTitle", {
                    defaultValue: "حذف قانون",
                })}
                message={t("process.regulations.removeConfirm", {
                    defaultValue:
                        "آیا از حذف قانون «{{title}}» از این آیتم مطمئن هستید؟",
                    title: removeCandidateLabel,
                })}
                loading={mutationBusy}
                confirmText={t("process.regulations.confirmRemove", {
                    defaultValue: "حذف",
                })}
                cancelText={t("process.regulations.cancelRemove", {
                    defaultValue: "انصراف",
                })}
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

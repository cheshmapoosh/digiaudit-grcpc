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

import type {
    AttachExistingControlRequest,
    ControlStructureNode,
    ControlSummary,
} from "@/features/control/domain/control.model";
import { controlService } from "@/features/control/service/control.service";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";

export interface ProcessControlsTabProps {
    subProcessId: string | null;
    subProcessTitle?: string | null;
    readOnly?: boolean;
    onOpenControl?: (controlAssignmentId: string) => void;
    onControlStructureChanged?: () => void | Promise<void>;
}

type ControlsLoadStatus = "idle" | "loading" | "success" | "error";

interface ControlsLoadState {
    subProcessId: string | null;
    retryKey: number;
    status: ControlsLoadStatus;
    assignedControls: ControlStructureNode[];
    controlOptions: ControlSummary[];
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

const ASSIGNMENT_TOOLBAR_STYLE: CSSProperties = {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
};

const CONTROL_COMBOBOX_STYLE: CSSProperties = {
    width: "min(28rem, 100%)",
    minWidth: "18rem",
};

const ACTIONS_STYLE: CSSProperties = {
    display: "inline-flex",
    gap: "0.5rem",
    flexWrap: "wrap",
};

const EMPTY_ASSIGNED_CONTROLS: ControlStructureNode[] = [];
const EMPTY_CONTROL_OPTIONS: ControlSummary[] = [];

function initialLoadState(subProcessId: string | null): ControlsLoadState {
    return {
        subProcessId,
        retryKey: 0,
        status: subProcessId ? "loading" : "idle",
        assignedControls: [],
        controlOptions: [],
    };
}

function formatOptionalValue(value: string | null | undefined, fallback: string): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
}

function formatControlOption(control: ControlSummary, fallback: string): string {
    return `${formatOptionalValue(control.code, fallback)} - ${formatOptionalValue(
        control.name,
        fallback,
    )}`;
}

function formatAssignedControlOption(control: ControlStructureNode, fallback: string): string {
    return `${formatOptionalValue(control.code, fallback)} - ${formatOptionalValue(
        control.title,
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

function isAssignedToSubProcess(item: ControlStructureNode, subProcessId: string): boolean {
    return (
        item.nodeType === "control" &&
        (item.parentId === subProcessId || item.subProcessId === subProcessId)
    );
}

function getAssignmentId(control: ControlStructureNode): string {
    return control.controlAssignmentId ?? control.id;
}

function formatValidity(control: ControlStructureNode): string {
    const validFrom = control.validFrom?.trim();
    const validTo = control.validTo?.trim();

    if (!validFrom && !validTo) {
        return "-";
    }

    return `${validFrom || "-"} - ${validTo || "-"}`;
}

function resolveStatusLabel(
    status: ControlStructureNode["status"],
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
    if (error instanceof Error && error.message === "DUPLICATE_ACTIVE_ASSIGNMENT") {
        return duplicateMessage;
    }

    return fallbackMessage;
}

export default function ProcessControlsTab({
    subProcessId,
    subProcessTitle,
    readOnly = false,
    onOpenControl,
    onControlStructureChanged,
}: ProcessControlsTabProps) {
    const { t } = useTranslation();
    const requestSeq = useRef(0);
    const [retryKey, setRetryKey] = useState(0);
    const [selectedControlId, setSelectedControlId] = useState("");
    const [selectedControlSearchValue, setSelectedControlSearchValue] = useState("");
    const [mutationBusy, setMutationBusy] = useState(false);
    const [mutationError, setMutationError] = useState<string | null>(null);
    const [removeCandidate, setRemoveCandidate] = useState<ControlStructureNode | null>(null);
    const [loadState, setLoadState] = useState<ControlsLoadState>(() =>
        initialLoadState(subProcessId),
    );

    useEffect(() => {
        if (!subProcessId) {
            setLoadState(initialLoadState(null));
            setRemoveCandidate(null);
            setSelectedControlId("");
            setSelectedControlSearchValue("");
            return;
        }

        const requestId = requestSeq.current + 1;
        requestSeq.current = requestId;

        Promise.all([controlService.getStructure(), controlService.list()])
            .then(([structureNodes, controlOptions]) => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    subProcessId,
                    retryKey,
                    status: "success",
                    assignedControls: structureNodes.filter((item) =>
                        isAssignedToSubProcess(item, subProcessId),
                    ),
                    controlOptions,
                });
                setRemoveCandidate(null);
                setMutationError(null);
            })
            .catch(() => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    subProcessId,
                    retryKey,
                    status: "error",
                    assignedControls: [],
                    controlOptions: [],
                });
            });

        return () => {
            if (requestSeq.current === requestId) {
                requestSeq.current += 1;
            }
        };
    }, [subProcessId, retryKey]);

    const noneText = t("common.none", { defaultValue: "ندارد" });
    const controlsTitle = t("process.controls.title", { defaultValue: "کنترل‌ها" });
    const titleText = subProcessTitle?.trim()
        ? `${controlsTitle} - ${subProcessTitle.trim()}`
        : controlsTitle;
    const duplicateMessage = t("process.controls.duplicate", {
        defaultValue: "این کنترل قبلاً به این زیر فرآیند متصل شده است.",
    });
    const mutationErrorFallback = t("process.controls.mutationError", {
        defaultValue: "خطا در ذخیره تغییرات کنترل‌های زیر فرآیند.",
    });
    const isCurrentLoad =
        loadState.subProcessId === subProcessId && loadState.retryKey === retryKey;
    const assignedControls = isCurrentLoad
        ? loadState.assignedControls
        : EMPTY_ASSIGNED_CONTROLS;
    const controlOptions = isCurrentLoad ? loadState.controlOptions : EMPTY_CONTROL_OPTIONS;
    const isLoading =
        !!subProcessId &&
        (loadState.subProcessId !== subProcessId ||
            loadState.retryKey !== retryKey ||
            loadState.status === "loading");
    const hasError =
        !!subProcessId &&
        !isLoading &&
        loadState.subProcessId === subProcessId &&
        loadState.retryKey === retryKey &&
        loadState.status === "error";
    const assignedControlIds = useMemo(
        () =>
            new Set(
                assignedControls
                    .map((control) => control.controlId)
                    .filter((controlId): controlId is string => Boolean(controlId)),
            ),
        [assignedControls],
    );
    const availableControls = useMemo(
        () => controlOptions.filter((control) => !assignedControlIds.has(control.id)),
        [assignedControlIds, controlOptions],
    );
    const selectedControl = availableControls.find(
        (control) => control.id === selectedControlId,
    );
    const controlComboBoxValue = selectedControl
        ? formatControlOption(selectedControl, noneText)
        : selectedControlSearchValue;
    const removeCandidateLabel = removeCandidate
        ? formatAssignedControlOption(removeCandidate, noneText)
        : "";
    const canAssign =
        !readOnly &&
        !!subProcessId &&
        !!selectedControlId &&
        availableControls.some((control) => control.id === selectedControlId) &&
        !isLoading &&
        !mutationBusy;

    const refresh = () => setRetryKey((current) => current + 1);

    const notifyControlStructureChanged = async () => {
        await Promise.resolve(onControlStructureChanged?.()).catch(() => undefined);
    };

    const handleAssign = async () => {
        if (readOnly || !subProcessId || !selectedControlId) {
            return;
        }

        if (assignedControlIds.has(selectedControlId)) {
            setMutationError(duplicateMessage);
            return;
        }

        if (!canAssign) {
            return;
        }

        const payload: AttachExistingControlRequest = {
            controlId: selectedControlId,
        };

        setMutationBusy(true);
        setMutationError(null);

        try {
            await controlService.attachExisting(subProcessId, payload);
            await notifyControlStructureChanged();
            setSelectedControlId("");
            setSelectedControlSearchValue("");
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
            await controlService.deleteAssignment(getAssignmentId(removeCandidate));
            await notifyControlStructureChanged();
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

    if (!subProcessId) {
        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">{titleText}</Title>

                <div style={{ height: "0.75rem" }} />

                <MessageStrip design="Information" hideCloseButton>
                    {t("process.controls.saveFirst", {
                        defaultValue: "ابتدا زیر فرآیند را ذخیره کنید.",
                    })}
                </MessageStrip>
            </div>
        );
    }

    if (hasError) {
        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">{titleText}</Title>

                <div style={{ height: "0.75rem" }} />

                <MessageStrip design="Negative" hideCloseButton>
                    {t("process.controls.loadError", {
                        defaultValue: "خطا در بارگذاری کنترل‌های زیر فرآیند.",
                    })}
                </MessageStrip>

                <div style={ERROR_ACTION_STYLE}>
                    <Button design="Emphasized" disabled={isLoading} onClick={refresh}>
                        {t("process.controls.retry", { defaultValue: "تلاش دوباره" })}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={TABLE_PANEL_STYLE}>
            <Title level="H5">{titleText}</Title>

            <div style={{ height: "0.75rem" }} />

            {!readOnly ? (
                <div style={ASSIGNMENT_TOOLBAR_STYLE}>
                    <ComboBox
                        accessibleName={t("process.controls.assignAccessibleName", {
                            defaultValue: "انتخاب کنترل برای اتصال",
                        })}
                        filter="Contains"
                        placeholder={t("process.controls.assignPlaceholder", {
                            defaultValue: "انتخاب کنترل",
                        })}
                        showClearIcon
                        style={CONTROL_COMBOBOX_STYLE}
                        value={controlComboBoxValue}
                        disabled={isLoading || mutationBusy || availableControls.length === 0}
                        onInput={(event) => {
                            const nextValue = readInputValue(event);
                            setSelectedControlSearchValue(nextValue);

                            const matchedOption = availableControls.find(
                                (control) => formatControlOption(control, noneText) === nextValue,
                            );
                            setSelectedControlId(matchedOption?.id ?? "");
                        }}
                        onSelectionChange={(event) => {
                            const nextValue = readSelectedComboBoxDataValue(event, selectedControlId);
                            const selectedOption = availableControls.find(
                                (control) => control.id === nextValue,
                            );

                            setSelectedControlId(nextValue);
                            setSelectedControlSearchValue(
                                selectedOption ? formatControlOption(selectedOption, noneText) : "",
                            );
                        }}
                    >
                        {availableControls.map((control) => (
                            <ComboBoxItem
                                key={control.id}
                                data-value={control.id}
                                text={formatControlOption(control, noneText)}
                            />
                        ))}
                    </ComboBox>

                    <Button design="Emphasized" disabled={!canAssign} onClick={handleAssign}>
                        {t("process.controls.assign", { defaultValue: "افزودن کنترل" })}
                    </Button>
                </div>
            ) : null}

            {availableControls.length === 0 && !isLoading ? (
                <>
                    <div style={{ height: "0.75rem" }} />
                    <MessageStrip design="Information" hideCloseButton>
                        {t("process.controls.noAssignable", {
                            defaultValue: "کنترل قابل اتصال دیگری وجود ندارد.",
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
                accessibleName={t("process.controls.tableAccessibleName", {
                    defaultValue: "جدول کنترل‌های زیر فرآیند",
                })}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell width="8rem">
                            {t("process.controls.columns.code", { defaultValue: "کد" })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("process.controls.columns.name", {
                                defaultValue: "نام کنترل",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="14rem">
                            {t("process.controls.columns.description", {
                                defaultValue: "شرح",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.controls.columns.status", {
                                defaultValue: "وضعیت",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="9rem">
                            {t("process.controls.columns.owner", {
                                defaultValue: "مسئول",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="12rem">
                            {t("process.controls.columns.validity", {
                                defaultValue: "اعتبار",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="12rem">
                            {t("process.controls.columns.actions", {
                                defaultValue: "عملیات",
                            })}
                        </TableHeaderCell>
                    </TableHeaderRow>
                }
                loading={isLoading}
                loadingDelay={0}
                noDataText={t("process.controls.empty", {
                    defaultValue: "هیچ کنترلی به این زیر فرآیند متصل نشده است.",
                })}
                overflowMode="Popin"
            >
                {assignedControls.map((control) => {
                    const assignmentId = getAssignmentId(control);

                    return (
                        <TableRow key={assignmentId} rowKey={assignmentId}>
                            <TableCell>
                                {formatOptionalValue(control.code, noneText)}
                            </TableCell>
                            <TableCell>
                                {formatOptionalValue(control.title, noneText)}
                            </TableCell>
                            <TableCell>
                                {formatOptionalValue(control.description, noneText)}
                            </TableCell>
                            <TableCell>{resolveStatusLabel(control.status, t)}</TableCell>
                            <TableCell>
                                {formatOptionalValue(control.ownerName, noneText)}
                            </TableCell>
                            <TableCell>{formatValidity(control)}</TableCell>
                            <TableCell>
                                <div style={ACTIONS_STYLE}>
                                    <Button
                                        design="Transparent"
                                        disabled={!onOpenControl || mutationBusy}
                                        onClick={() => onOpenControl?.(assignmentId)}
                                    >
                                        {t("process.controls.show", {
                                            defaultValue: "نمایش",
                                        })}
                                    </Button>
                                    {!readOnly ? (
                                        <Button
                                            design="Transparent"
                                            disabled={mutationBusy}
                                            onClick={() => setRemoveCandidate(control)}
                                        >
                                            {t("process.controls.remove", {
                                                defaultValue: "حذف",
                                            })}
                                        </Button>
                                    ) : null}
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </Table>

            <DeleteConfirmDialog
                open={!!removeCandidate}
                title={t("process.controls.removeTitle", {
                    defaultValue: "حذف اتصال کنترل",
                })}
                message={t("process.controls.removeConfirm", {
                    defaultValue: "آیا از حذف اتصال کنترل «{{title}}» مطمئن هستید؟",
                    title: removeCandidateLabel,
                })}
                loading={mutationBusy}
                confirmText={t("process.controls.confirmRemove", {
                    defaultValue: "حذف",
                })}
                cancelText={t("process.controls.cancelRemove", {
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

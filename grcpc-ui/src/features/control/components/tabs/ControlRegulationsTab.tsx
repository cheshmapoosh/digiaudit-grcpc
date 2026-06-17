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
import type { ControlRegulationLink } from "../../domain/control.model";
import { controlService } from "../../service/control.service";
import { displayDate } from "./ControlTabUtils";

export interface ControlRegulationsTabProps {
    controlAssignmentId: string;
    readOnly?: boolean;
    showActions?: boolean;
}

type RegulationsLoadStatus = "loading" | "success" | "error";

interface RegulationsLoadState {
    controlAssignmentId: string;
    retryKey: number;
    status: RegulationsLoadStatus;
    links: ControlRegulationLink[];
    regulationOptions: RegulationNode[];
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

const REGULATION_COMBOBOX_STYLE: CSSProperties = {
    width: "min(28rem, 100%)",
    minWidth: "18rem",
};

const EMPTY_LINKS: ControlRegulationLink[] = [];
const EMPTY_REGULATION_OPTIONS: RegulationNode[] = [];

function initialLoadState(controlAssignmentId: string): RegulationsLoadState {
    return {
        controlAssignmentId,
        retryKey: 0,
        status: "loading",
        links: [],
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

function formatLinkOption(link: ControlRegulationLink, fallback: string): string {
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

export default function ControlRegulationsTab({
    controlAssignmentId,
    readOnly = false,
    showActions = true,
}: ControlRegulationsTabProps) {
    const { t } = useTranslation();
    const requestSeq = useRef(0);
    const [retryKey, setRetryKey] = useState(0);
    const [selectedLawId, setSelectedLawId] = useState("");
    const [selectedLawSearchValue, setSelectedLawSearchValue] = useState("");
    const [mutationBusy, setMutationBusy] = useState(false);
    const [mutationError, setMutationError] = useState<string | null>(null);
    const [removeCandidate, setRemoveCandidate] =
        useState<ControlRegulationLink | null>(null);
    const [loadState, setLoadState] = useState<RegulationsLoadState>(() =>
        initialLoadState(controlAssignmentId),
    );

    useEffect(() => {
        const requestId = requestSeq.current + 1;
        requestSeq.current = requestId;

        const shouldLoadCatalog = showActions && !readOnly;

        Promise.all([
            controlService.listRegulations(controlAssignmentId),
            shouldLoadCatalog ? regulationService.list() : Promise.resolve([]),
        ])
            .then(([links, regulationOptions]) => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    controlAssignmentId,
                    retryKey,
                    status: "success",
                    links,
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
                    controlAssignmentId,
                    retryKey,
                    status: "error",
                    links: [],
                    regulationOptions: [],
                });
            });

        return () => {
            if (requestSeq.current === requestId) {
                requestSeq.current += 1;
            }
        };
    }, [controlAssignmentId, readOnly, retryKey, showActions]);

    const noneText = t("common.none", { defaultValue: "ندارد" });
    const duplicateMessage = t("control.regulations.duplicate", {
        defaultValue: "این قانون قبلاً افزوده شده است.",
    });
    const mutationErrorFallback = t("control.regulations.mutationError", {
        defaultValue: "خطا در ذخیره تغییرات قوانین.",
    });
    const isCurrentLoad =
        loadState.controlAssignmentId === controlAssignmentId &&
        loadState.retryKey === retryKey;
    const links = isCurrentLoad ? loadState.links : EMPTY_LINKS;
    const regulationOptions = isCurrentLoad
        ? loadState.regulationOptions
        : EMPTY_REGULATION_OPTIONS;
    const isLoading =
        loadState.controlAssignmentId !== controlAssignmentId ||
        loadState.retryKey !== retryKey ||
        loadState.status === "loading";
    const hasError =
        !isLoading &&
        loadState.controlAssignmentId === controlAssignmentId &&
        loadState.retryKey === retryKey &&
        loadState.status === "error";
    const addedLawIds = useMemo(
        () => new Set(links.map((link) => link.regulationId)),
        [links],
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
        ? formatLinkOption(removeCandidate, noneText)
        : "";
    const canAdd =
        showActions &&
        !readOnly &&
        !!selectedLawId &&
        availableLaws.some((law) => law.id === selectedLawId) &&
        !isLoading &&
        !mutationBusy;

    const refresh = () => setRetryKey((current) => current + 1);

    const handleAdd = async () => {
        if (!showActions || readOnly || !selectedLawId) {
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
            await controlService.linkRegulation(controlAssignmentId, selectedLawId);
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
        if (!showActions || readOnly || !removeCandidate) {
            return;
        }

        setMutationBusy(true);
        setMutationError(null);

        try {
            await controlService.deleteRegulationLink(
                controlAssignmentId,
                removeCandidate.id,
            );
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

    if (hasError) {
        return (
            <div style={PANEL_STYLE}>
                <Title level="H5">
                    {t("control.regulations.title", { defaultValue: "قوانین" })}
                </Title>
                <MessageStrip design="Negative" hideCloseButton>
                    {t("control.regulations.loadError", {
                        defaultValue: "خطا در بارگذاری قوانین.",
                    })}
                </MessageStrip>
                {showActions ? (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button design="Emphasized" disabled={isLoading} onClick={refresh}>
                            {t("control.regulations.retry", { defaultValue: "تلاش دوباره" })}
                        </Button>
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div style={PANEL_STYLE}>
            <Title level="H5">
                {t("control.regulations.title", { defaultValue: "قوانین" })}
            </Title>

            {showActions && !readOnly ? (
                <div style={ADD_TOOLBAR_STYLE}>
                    <ComboBox
                        accessibleName={t("control.regulations.addAccessibleName", {
                            defaultValue: "انتخاب قانون برای افزودن",
                        })}
                        filter="Contains"
                        placeholder={t("control.regulations.addPlaceholder", {
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
                        {t("control.regulations.add", { defaultValue: "افزودن" })}
                    </Button>
                </div>
            ) : null}

            {showActions && !readOnly && availableLaws.length === 0 && !isLoading ? (
                <MessageStrip design="Information" hideCloseButton>
                    {t("control.regulations.noAssignable", {
                        defaultValue: "قانون قابل افزودن دیگری وجود ندارد.",
                    })}
                </MessageStrip>
            ) : null}

            {mutationError ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {mutationError}
                </MessageStrip>
            ) : null}

            <Table
                accessibleName={t("control.regulations.tableAccessibleName", {
                    defaultValue: "جدول قوانین کنترل",
                })}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell width="8rem">
                            {t("control.regulations.columns.code", { defaultValue: "کد" })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("control.regulations.columns.title", {
                                defaultValue: "نام قانون",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="14rem">
                            {t("control.regulations.columns.description", {
                                defaultValue: "شرح",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="12rem">
                            {t("control.regulations.columns.validity", {
                                defaultValue: "اعتبار",
                            })}
                        </TableHeaderCell>
                        {showActions ? (
                            <TableHeaderCell width="8rem">
                                {t("control.regulations.columns.actions", {
                                    defaultValue: "عملیات",
                                })}
                            </TableHeaderCell>
                        ) : null}
                    </TableHeaderRow>
                }
                loading={isLoading}
                loadingDelay={0}
                noDataText={t("control.regulations.empty", {
                    defaultValue: "قانونی افزوده نشده است.",
                })}
                overflowMode="Popin"
            >
                {links.map((link) => (
                    <TableRow key={link.id} rowKey={link.id}>
                        <TableCell>{formatOptionalValue(link.code, noneText)}</TableCell>
                        <TableCell>{formatOptionalValue(link.title, noneText)}</TableCell>
                        <TableCell>{formatOptionalValue(link.description, noneText)}</TableCell>
                        <TableCell>
                            {`${displayDate(link.validFrom)} - ${displayDate(link.validTo)}`}
                        </TableCell>
                        {showActions ? (
                            <TableCell>
                                {!readOnly ? (
                                    <Button
                                        design="Transparent"
                                        disabled={mutationBusy}
                                        onClick={() => setRemoveCandidate(link)}
                                    >
                                        {t("control.regulations.remove", { defaultValue: "حذف" })}
                                    </Button>
                                ) : null}
                            </TableCell>
                        ) : null}
                    </TableRow>
                ))}
            </Table>

            {showActions ? (
                <DeleteConfirmDialog
                    open={!!removeCandidate}
                title={t("control.regulations.removeTitle", {
                    defaultValue: "حذف قانون",
                })}
                message={t("control.regulations.removeConfirm", {
                    defaultValue: "آیا از حذف قانون «{{title}}» مطمئن هستید؟",
                    title: removeCandidateLabel,
                })}
                loading={mutationBusy}
                confirmText={t("control.regulations.confirmRemove", {
                    defaultValue: "حذف",
                })}
                cancelText={t("control.regulations.cancelRemove", {
                    defaultValue: "انصراف",
                })}
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

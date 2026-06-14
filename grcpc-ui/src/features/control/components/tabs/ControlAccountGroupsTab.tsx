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

import type { AccountGroupNode } from "@/features/account-group/domain/accountGroup.model";
import { accountGroupService } from "@/features/account-group/service/accountGroup.service";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { HttpError } from "@/shared/infra/http.client";
import type { ControlAccountGroupLink } from "../../domain/control.model";
import { controlService } from "../../service/control.service";

export interface ControlAccountGroupsTabProps {
    controlAssignmentId: string;
}

type AccountGroupsLoadStatus = "loading" | "success" | "error";

interface AccountGroupsLoadState {
    controlAssignmentId: string;
    retryKey: number;
    status: AccountGroupsLoadStatus;
    links: ControlAccountGroupLink[];
    accountGroupOptions: AccountGroupNode[];
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

const ACCOUNT_GROUP_COMBOBOX_STYLE: CSSProperties = {
    width: "min(28rem, 100%)",
    minWidth: "18rem",
};

const EMPTY_LINKS: ControlAccountGroupLink[] = [];
const EMPTY_ACCOUNT_GROUP_OPTIONS: AccountGroupNode[] = [];

function initialLoadState(controlAssignmentId: string): AccountGroupsLoadState {
    return {
        controlAssignmentId,
        retryKey: 0,
        status: "loading",
        links: [],
        accountGroupOptions: [],
    };
}

function formatOptionalValue(value: string | null | undefined, fallback: string): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
}

function formatAccountGroupOption(accountGroup: AccountGroupNode, fallback: string): string {
    return `${formatOptionalValue(accountGroup.code, fallback)} - ${formatOptionalValue(
        accountGroup.title,
        fallback,
    )}`;
}

function formatLinkOption(link: ControlAccountGroupLink, fallback: string): string {
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

function formatAssertionType(
    assertionType: string | null | undefined,
    fallback: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const normalized = assertionType?.trim();

    if (!normalized) {
        return fallback;
    }

    const labels: Record<string, string> = {
        existence: t("accountGroup.assertions.existence", { defaultValue: "وجود داشتن" }),
        completeness: t("accountGroup.assertions.completeness", {
            defaultValue: "کامل بودن",
        }),
        valuation: t("accountGroup.assertions.valuation", { defaultValue: "ارزشگذاری" }),
        disclosure: t("accountGroup.assertions.disclosure", { defaultValue: "افشا" }),
    };

    return normalized
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => labels[item] ?? item)
        .join("، ");
}

export default function ControlAccountGroupsTab({
    controlAssignmentId,
}: ControlAccountGroupsTabProps) {
    const { t } = useTranslation();
    const requestSeq = useRef(0);
    const [retryKey, setRetryKey] = useState(0);
    const [selectedAccountGroupId, setSelectedAccountGroupId] = useState("");
    const [selectedAccountGroupSearchValue, setSelectedAccountGroupSearchValue] =
        useState("");
    const [mutationBusy, setMutationBusy] = useState(false);
    const [mutationError, setMutationError] = useState<string | null>(null);
    const [removeCandidate, setRemoveCandidate] =
        useState<ControlAccountGroupLink | null>(null);
    const [loadState, setLoadState] = useState<AccountGroupsLoadState>(() =>
        initialLoadState(controlAssignmentId),
    );

    useEffect(() => {
        const requestId = requestSeq.current + 1;
        requestSeq.current = requestId;

        Promise.all([
            controlService.listAccountGroups(controlAssignmentId),
            accountGroupService.list(),
        ])
            .then(([links, accountGroupOptions]) => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    controlAssignmentId,
                    retryKey,
                    status: "success",
                    links,
                    accountGroupOptions,
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
                    accountGroupOptions: [],
                });
            });

        return () => {
            if (requestSeq.current === requestId) {
                requestSeq.current += 1;
            }
        };
    }, [controlAssignmentId, retryKey]);

    const noneText = t("common.none", { defaultValue: "ندارد" });
    const duplicateMessage = t("control.accountGroups.duplicate", {
        defaultValue: "این گروه حساب قبلاً افزوده شده است.",
    });
    const mutationErrorFallback = t("control.accountGroups.mutationError", {
        defaultValue: "خطا در ذخیره تغییرات گروه حساب‌ها.",
    });
    const isCurrentLoad =
        loadState.controlAssignmentId === controlAssignmentId &&
        loadState.retryKey === retryKey;
    const links = isCurrentLoad ? loadState.links : EMPTY_LINKS;
    const accountGroupOptions = isCurrentLoad
        ? loadState.accountGroupOptions
        : EMPTY_ACCOUNT_GROUP_OPTIONS;
    const isLoading =
        loadState.controlAssignmentId !== controlAssignmentId ||
        loadState.retryKey !== retryKey ||
        loadState.status === "loading";
    const hasError =
        !isLoading &&
        loadState.controlAssignmentId === controlAssignmentId &&
        loadState.retryKey === retryKey &&
        loadState.status === "error";
    const addedAccountGroupIds = useMemo(
        () => new Set(links.map((link) => link.accountGroupId)),
        [links],
    );
    const availableAccountGroups = useMemo(
        () =>
            accountGroupOptions.filter(
                (accountGroup) => !addedAccountGroupIds.has(accountGroup.id),
            ),
        [accountGroupOptions, addedAccountGroupIds],
    );
    const selectedAccountGroup = availableAccountGroups.find(
        (accountGroup) => accountGroup.id === selectedAccountGroupId,
    );
    const accountGroupComboBoxValue = selectedAccountGroup
        ? formatAccountGroupOption(selectedAccountGroup, noneText)
        : selectedAccountGroupSearchValue;
    const removeCandidateLabel = removeCandidate
        ? formatLinkOption(removeCandidate, noneText)
        : "";
    const canAdd =
        !!selectedAccountGroupId &&
        availableAccountGroups.some(
            (accountGroup) => accountGroup.id === selectedAccountGroupId,
        ) &&
        !isLoading &&
        !mutationBusy;

    const refresh = () => setRetryKey((current) => current + 1);

    const handleAdd = async () => {
        if (!selectedAccountGroupId) {
            return;
        }

        if (addedAccountGroupIds.has(selectedAccountGroupId)) {
            setMutationError(duplicateMessage);
            return;
        }

        if (!canAdd) {
            return;
        }

        setMutationBusy(true);
        setMutationError(null);

        try {
            await controlService.linkAccountGroup(
                controlAssignmentId,
                selectedAccountGroupId,
            );
            setSelectedAccountGroupId("");
            setSelectedAccountGroupSearchValue("");
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
        if (!removeCandidate) {
            return;
        }

        setMutationBusy(true);
        setMutationError(null);

        try {
            await controlService.deleteAccountGroupLink(
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
                    {t("control.accountGroups.title", { defaultValue: "گروه حساب‌ها" })}
                </Title>
                <MessageStrip design="Negative" hideCloseButton>
                    {t("control.accountGroups.loadError", {
                        defaultValue: "خطا در بارگذاری گروه حساب‌ها.",
                    })}
                </MessageStrip>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button design="Emphasized" disabled={isLoading} onClick={refresh}>
                        {t("control.accountGroups.retry", { defaultValue: "تلاش دوباره" })}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={PANEL_STYLE}>
            <Title level="H5">
                {t("control.accountGroups.title", { defaultValue: "گروه حساب‌ها" })}
            </Title>

            <div style={ADD_TOOLBAR_STYLE}>
                <ComboBox
                    accessibleName={t("control.accountGroups.addAccessibleName", {
                        defaultValue: "انتخاب گروه حساب برای افزودن",
                    })}
                    filter="Contains"
                    placeholder={t("control.accountGroups.addPlaceholder", {
                        defaultValue: "انتخاب گروه حساب",
                    })}
                    showClearIcon
                    style={ACCOUNT_GROUP_COMBOBOX_STYLE}
                    value={accountGroupComboBoxValue}
                    disabled={
                        isLoading || mutationBusy || availableAccountGroups.length === 0
                    }
                    onInput={(event) => {
                        const nextValue = readInputValue(event);
                        setSelectedAccountGroupSearchValue(nextValue);

                        const matchedOption = availableAccountGroups.find(
                            (accountGroup) =>
                                formatAccountGroupOption(accountGroup, noneText) ===
                                nextValue,
                        );
                        setSelectedAccountGroupId(matchedOption?.id ?? "");
                    }}
                    onSelectionChange={(event) => {
                        const nextValue = readSelectedComboBoxDataValue(
                            event,
                            selectedAccountGroupId,
                        );
                        const selectedOption = availableAccountGroups.find(
                            (accountGroup) => accountGroup.id === nextValue,
                        );

                        setSelectedAccountGroupId(nextValue);
                        setSelectedAccountGroupSearchValue(
                            selectedOption
                                ? formatAccountGroupOption(selectedOption, noneText)
                                : "",
                        );
                    }}
                >
                    {availableAccountGroups.map((accountGroup) => (
                        <ComboBoxItem
                            key={accountGroup.id}
                            data-value={accountGroup.id}
                            text={formatAccountGroupOption(accountGroup, noneText)}
                        />
                    ))}
                </ComboBox>

                <Button design="Emphasized" disabled={!canAdd} onClick={handleAdd}>
                    {t("control.accountGroups.add", { defaultValue: "افزودن" })}
                </Button>
            </div>

            {availableAccountGroups.length === 0 && !isLoading ? (
                <MessageStrip design="Information" hideCloseButton>
                    {t("control.accountGroups.noAssignable", {
                        defaultValue: "گروه حساب قابل افزودن دیگری وجود ندارد.",
                    })}
                </MessageStrip>
            ) : null}

            {mutationError ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {mutationError}
                </MessageStrip>
            ) : null}

            <Table
                accessibleName={t("control.accountGroups.tableAccessibleName", {
                    defaultValue: "جدول گروه حساب‌های کنترل",
                })}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell width="8rem">
                            {t("control.accountGroups.columns.code", { defaultValue: "کد" })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("control.accountGroups.columns.title", {
                                defaultValue: "نام گروه حساب",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="14rem">
                            {t("control.accountGroups.columns.description", {
                                defaultValue: "شرح",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="12rem">
                            {t("control.accountGroups.columns.assertionType", {
                                defaultValue: "نوع ادعا",
                            })}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("control.accountGroups.columns.actions", {
                                defaultValue: "عملیات",
                            })}
                        </TableHeaderCell>
                    </TableHeaderRow>
                }
                loading={isLoading}
                loadingDelay={0}
                noDataText={t("control.accountGroups.empty", {
                    defaultValue: "گروه حسابی افزوده نشده است.",
                })}
                overflowMode="Popin"
            >
                {links.map((link) => (
                    <TableRow key={link.id} rowKey={link.id}>
                        <TableCell>{formatOptionalValue(link.code, noneText)}</TableCell>
                        <TableCell>{formatOptionalValue(link.title, noneText)}</TableCell>
                        <TableCell>{formatOptionalValue(link.description, noneText)}</TableCell>
                        <TableCell>
                            {formatAssertionType(link.assertionType, noneText, t)}
                        </TableCell>
                        <TableCell>
                            <Button
                                design="Transparent"
                                disabled={mutationBusy}
                                onClick={() => setRemoveCandidate(link)}
                            >
                                {t("control.accountGroups.remove", { defaultValue: "حذف" })}
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </Table>

            <DeleteConfirmDialog
                open={!!removeCandidate}
                title={t("control.accountGroups.removeTitle", {
                    defaultValue: "حذف گروه حساب",
                })}
                message={t("control.accountGroups.removeConfirm", {
                    defaultValue: "آیا از حذف گروه حساب «{{title}}» مطمئن هستید؟",
                    title: removeCandidateLabel,
                })}
                loading={mutationBusy}
                confirmText={t("control.accountGroups.confirmRemove", {
                    defaultValue: "حذف",
                })}
                cancelText={t("control.accountGroups.cancelRemove", {
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

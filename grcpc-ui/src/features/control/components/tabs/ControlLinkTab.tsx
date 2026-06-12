import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    Dialog,
    Input,
    MessageStrip,
    Option,
    Select,
} from "@ui5/webcomponents-react";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import {
    ControlFormField,
    ControlTabShell,
    ControlTable,
    DeleteButton,
    RowActions,
} from "./ControlTabPrimitives";
import {
    displayDate,
    displayText,
    mapControlTabError,
    readInputValue,
    readSelectedDataValue,
    type ControlTableColumn,
} from "./ControlTabUtils";

export interface ControlLinkItem {
    id: string;
    code?: string | null;
    title?: string | null;
    description?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
}

export interface ControlCatalogOption {
    id: string;
    code?: string | null;
    title: string;
    description?: string | null;
}

export interface ControlLinkTabProps<TLink extends ControlLinkItem> {
    controlAssignmentId: string;
    title: string;
    addText: string;
    dialogTitle: string;
    emptyText: string;
    catalogLabel: string;
    catalogSearchPlaceholder: string;
    catalogEmptyText: string;
    listLinks: (controlAssignmentId: string) => Promise<TLink[]>;
    linkItem: (controlAssignmentId: string, referenceId: string) => Promise<TLink>;
    deleteLink: (controlAssignmentId: string, linkId: string) => Promise<void>;
    loadCatalog: () => Promise<ControlCatalogOption[]>;
    getLinkedReferenceId: (item: TLink) => string;
    extraColumns?: ControlTableColumn<TLink>[];
}

function normalize(value?: string | null): string {
    return (value ?? "").trim().toLocaleLowerCase("fa");
}

export default function ControlLinkTab<TLink extends ControlLinkItem>({
    controlAssignmentId,
    title,
    addText,
    dialogTitle,
    emptyText,
    catalogLabel,
    catalogSearchPlaceholder,
    catalogEmptyText,
    listLinks,
    linkItem,
    deleteLink,
    loadCatalog,
    getLinkedReferenceId,
    extraColumns = [],
}: ControlLinkTabProps<TLink>) {
    const { t } = useTranslation();
    const [items, setItems] = useState<TLink[]>([]);
    const [catalog, setCatalog] = useState<ControlCatalogOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [selectedReferenceId, setSelectedReferenceId] = useState("");
    const [manualReferenceId, setManualReferenceId] = useState("");

    useEffect(() => {
        let active = true;

        void Promise.allSettled([
            listLinks(controlAssignmentId),
            loadCatalog(),
        ]).then(([linksResult, catalogResult]) => {
            if (!active) {
                return;
            }

            if (linksResult.status === "fulfilled") {
                setItems(linksResult.value);
            } else {
                setError(
                    mapControlTabError(
                        linksResult.reason,
                        t("control.errors.loadLinks", {
                            defaultValue: "Failed to load linked items.",
                        }),
                    ),
                );
            }

            if (catalogResult.status === "fulfilled") {
                setCatalog(catalogResult.value);
                setCatalogError(null);
            } else {
                setCatalog([]);
                setCatalogError(
                    mapControlTabError(
                        catalogResult.reason,
                        t("control.errors.loadCatalog", {
                            defaultValue: "Failed to load catalog.",
                        }),
                    ),
                );
            }

            setLoading(false);
            setCatalogLoading(false);
        });

        return () => {
            active = false;
        };
    }, [controlAssignmentId, listLinks, loadCatalog, t]);

    const reloadLinks = async () => {
        setLoading(true);
        try {
            setItems(await listLinks(controlAssignmentId));
            setError(null);
        } catch (loadError) {
            setError(
                mapControlTabError(
                    loadError,
                    t("control.errors.loadLinks", {
                        defaultValue: "Failed to load linked items.",
                    }),
                ),
            );
        } finally {
            setLoading(false);
        }
    };

    const linkedReferenceIds = useMemo(
        () => new Set(items.map((item) => getLinkedReferenceId(item))),
        [getLinkedReferenceId, items],
    );

    const availableCatalog = useMemo(() => {
        const query = normalize(searchText);

        return catalog
            .filter((item) => !linkedReferenceIds.has(item.id))
            .filter((item) => {
                if (!query) {
                    return true;
                }

                return (
                    normalize(item.code).includes(query) ||
                    normalize(item.title).includes(query) ||
                    normalize(item.description).includes(query)
                );
            });
    }, [catalog, linkedReferenceIds, searchText]);

    const openDialog = () => {
        setSearchText("");
        setSelectedReferenceId("");
        setManualReferenceId("");
        setValidationError(null);
        setDialogOpen(true);
    };

    const handleLink = async () => {
        const referenceId = selectedReferenceId || manualReferenceId.trim();

        if (!referenceId) {
            setValidationError(
                t("control.validation.referenceRequired", {
                    defaultValue: "Select or enter a reference.",
                }),
            );
            return;
        }

        try {
            setSaving(true);
            setError(null);
            await linkItem(controlAssignmentId, referenceId);
            setDialogOpen(false);
            await reloadLinks();
        } catch (linkError) {
            setError(
                mapControlTabError(
                    linkError,
                    t("control.errors.linkItem", {
                        defaultValue: "Failed to link item.",
                    }),
                ),
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (linkId: string) => {
        try {
            setSaving(true);
            setError(null);
            await deleteLink(controlAssignmentId, linkId);
            await reloadLinks();
        } catch (deleteError) {
            setError(
                mapControlTabError(
                    deleteError,
                    t("control.errors.deleteLink", {
                        defaultValue: "Failed to delete link.",
                    }),
                ),
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <ControlTabShell
                title={title}
                loading={loading}
                error={error}
                onErrorClose={() => setError(null)}
                empty={!items.length}
                action={
                    <Button design="Emphasized" disabled={loading || saving} onClick={openDialog}>
                        {addText}
                    </Button>
                }
            >
                {!items.length ? (
                    emptyText
                ) : (
                    <ControlTable
                        items={items}
                        columns={[
                            {
                                key: "code",
                                label: t("control.fields.code", { defaultValue: "Code" }),
                                render: (item) => displayText(item.code),
                            },
                            {
                                key: "title",
                                label: t("control.fields.title", { defaultValue: "Title" }),
                                render: (item) => displayText(item.title),
                            },
                            ...extraColumns,
                            {
                                key: "validity",
                                label: t("control.fields.validity", { defaultValue: "Validity" }),
                                render: (item) =>
                                    `${displayDate(item.validFrom)} - ${displayDate(item.validTo)}`,
                            },
                            {
                                key: "description",
                                label: t("control.fields.description", {
                                    defaultValue: "Description",
                                }),
                                render: (item) => displayText(item.description),
                            },
                            {
                                key: "actions",
                                label: t("common.actions", { defaultValue: "Actions" }),
                                width: "8rem",
                                render: (item) => (
                                    <RowActions>
                                        <DeleteButton
                                            disabled={saving}
                                            onClick={() => {
                                                void handleDelete(item.id);
                                            }}
                                        >
                                            {t("common.delete", { defaultValue: "Delete" })}
                                        </DeleteButton>
                                    </RowActions>
                                ),
                            },
                        ]}
                    />
                )}
            </ControlTabShell>

            <Dialog
                open={dialogOpen}
                accessibleName={dialogTitle}
                style={{ width: "42rem", maxWidth: "96vw" }}
                onClose={() => setDialogOpen(false)}
                footer={
                    <>
                        <Button
                            design="Emphasized"
                            disabled={saving || catalogLoading}
                            onClick={() => {
                                void handleLink();
                            }}
                        >
                            {t("control.actions.link", { defaultValue: "Link" })}
                        </Button>
                        <Button design="Transparent" disabled={saving} onClick={() => setDialogOpen(false)}>
                            {t("common.cancel", { defaultValue: "Cancel" })}
                        </Button>
                    </>
                }
            >
                <ModalDialogHeader title={dialogTitle} onClose={() => setDialogOpen(false)} />

                <div style={{ display: "grid", gap: "1rem", padding: "0.25rem" }}>
                    {catalogError ? (
                        <MessageStrip design="Information" onClose={() => setCatalogError(null)}>
                            {catalogError}
                        </MessageStrip>
                    ) : null}

                    {validationError ? (
                        <MessageStrip design="Negative" onClose={() => setValidationError(null)}>
                            {validationError}
                        </MessageStrip>
                    ) : null}

                    {catalog.length ? (
                        <>
                            <ControlFormField label={catalogLabel}>
                                <Input
                                    value={searchText}
                                    disabled={saving || catalogLoading}
                                    placeholder={catalogSearchPlaceholder}
                                    onInput={(event) => setSearchText(readInputValue(event))}
                                />
                            </ControlFormField>

                            <ControlFormField label={catalogLabel}>
                                <Select
                                    disabled={saving || catalogLoading || !availableCatalog.length}
                                    onChange={(event) =>
                                        setSelectedReferenceId(
                                            readSelectedDataValue(event, selectedReferenceId),
                                        )
                                    }
                                >
                                    <Option data-value="" selected={!selectedReferenceId}>
                                        {t("common.select", { defaultValue: "Select" })}
                                    </Option>
                                    {availableCatalog.map((option) => (
                                        <Option
                                            key={option.id}
                                            data-value={option.id}
                                            selected={selectedReferenceId === option.id}
                                        >
                                            {`${displayText(option.code)} - ${option.title}`}
                                        </Option>
                                    ))}
                                </Select>
                            </ControlFormField>

                            {!availableCatalog.length ? (
                                <MessageStrip design="Information" hideCloseButton>
                                    {catalogEmptyText}
                                </MessageStrip>
                            ) : null}
                        </>
                    ) : (
                        <ControlFormField
                            label={t("control.fields.referenceId", { defaultValue: "Reference ID" })}
                            required
                        >
                            <Input
                                value={manualReferenceId}
                                disabled={saving || catalogLoading}
                                placeholder={t("control.links.uuidPlaceholder", {
                                    defaultValue: "Enter reference UUID",
                                })}
                                onInput={(event) => setManualReferenceId(readInputValue(event))}
                            />
                        </ControlFormField>
                    )}
                </div>
            </Dialog>
        </>
    );
}

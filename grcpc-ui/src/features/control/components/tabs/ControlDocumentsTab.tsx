import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    Dialog,
    Input,
    MessageStrip,
    TextArea,
} from "@ui5/webcomponents-react";

import type {
    ControlDocument,
    CreateControlDocumentRequest,
} from "../../domain/control.model";
import { controlService } from "../../service/control.service";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import {
    ControlFormField,
    ControlTabShell,
    ControlTable,
    DeleteButton,
    RowActions,
} from "./ControlTabPrimitives";
import {
    displayText,
    mapControlTabError,
    normalizeOptionalText,
    readInputValue,
} from "./ControlTabUtils";

interface ControlDocumentFormState {
    name: string;
    documentType: string;
    fileRef: string;
    description: string;
}

export interface ControlDocumentsTabProps {
    controlAssignmentId: string;
}

const EMPTY_FORM: ControlDocumentFormState = {
    name: "",
    documentType: "",
    fileRef: "",
    description: "",
};

const FORM_GRID_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "1rem",
};

function toFormState(document: ControlDocument | null): ControlDocumentFormState {
    return {
        name: document?.name ?? "",
        documentType: document?.documentType ?? "",
        fileRef: document?.fileRef ?? "",
        description: document?.description ?? "",
    };
}

function toPayload(form: ControlDocumentFormState): CreateControlDocumentRequest {
    return {
        name: form.name.trim(),
        documentType: normalizeOptionalText(form.documentType),
        fileRef: normalizeOptionalText(form.fileRef),
        description: normalizeOptionalText(form.description),
    };
}

export default function ControlDocumentsTab({ controlAssignmentId }: ControlDocumentsTabProps) {
    const { t } = useTranslation();
    const [items, setItems] = useState<ControlDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ControlDocument | null>(null);
    const [form, setForm] = useState<ControlDocumentFormState>(EMPTY_FORM);

    useEffect(() => {
        let active = true;

        void controlService
            .listDocuments(controlAssignmentId)
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
                            t("control.errors.loadDocuments", {
                                defaultValue: "Failed to load documents.",
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
    }, [controlAssignmentId, t]);

    const reload = async () => {
        setLoading(true);
        try {
            setItems(await controlService.listDocuments(controlAssignmentId));
            setError(null);
        } catch (loadError) {
            setError(
                mapControlTabError(
                    loadError,
                    t("control.errors.loadDocuments", {
                        defaultValue: "Failed to load documents.",
                    }),
                ),
            );
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setForm(EMPTY_FORM);
        setValidationError(null);
        setDialogOpen(true);
    };

    const openEditDialog = (item: ControlDocument) => {
        setEditingItem(item);
        setForm(toFormState(item));
        setValidationError(null);
        setDialogOpen(true);
    };

    const handleChange = <K extends keyof ControlDocumentFormState>(
        key: K,
        value: ControlDocumentFormState[K],
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const validate = (): boolean => {
        if (!form.name.trim()) {
            setValidationError(
                t("control.validation.documentNameRequired", {
                    defaultValue: "Document name is required.",
                }),
            );
            return false;
        }

        setValidationError(null);
        return true;
    };

    const handleSave = async () => {
        if (!validate()) {
            return;
        }

        try {
            setSaving(true);
            setError(null);
            const payload = toPayload(form);

            if (editingItem) {
                await controlService.updateDocument(controlAssignmentId, editingItem.id, payload);
            } else {
                await controlService.createDocument(controlAssignmentId, payload);
            }

            setDialogOpen(false);
            await reload();
        } catch (saveError) {
            setError(
                mapControlTabError(
                    saveError,
                    t("control.errors.saveDocument", {
                        defaultValue: "Failed to save document.",
                    }),
                ),
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (documentId: string) => {
        try {
            setSaving(true);
            setError(null);
            await controlService.deleteDocument(controlAssignmentId, documentId);
            await reload();
        } catch (deleteError) {
            setError(
                mapControlTabError(
                    deleteError,
                    t("control.errors.deleteDocument", {
                        defaultValue: "Failed to delete document.",
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
                title={t("control.tabs.documents", { defaultValue: "Documents" })}
                loading={loading}
                error={error}
                onErrorClose={() => setError(null)}
                empty={!items.length}
                action={
                    <Button design="Emphasized" disabled={loading || saving} onClick={openCreateDialog}>
                        {t("control.actions.addDocument", { defaultValue: "Add Document" })}
                    </Button>
                }
            >
                {!items.length ? (
                    t("control.empty.documents", { defaultValue: "No documents have been defined." })
                ) : (
                    <ControlTable
                        items={items}
                        columns={[
                            {
                                key: "name",
                                label: t("control.fields.name", { defaultValue: "Name" }),
                                render: (item) => displayText(item.name),
                            },
                            {
                                key: "documentType",
                                label: t("control.fields.documentType", {
                                    defaultValue: "Document Type",
                                }),
                                render: (item) => displayText(item.documentType),
                            },
                            {
                                key: "fileRef",
                                label: t("control.fields.fileRef", { defaultValue: "File Reference" }),
                                render: (item) => displayText(item.fileRef),
                            },
                            {
                                key: "description",
                                label: t("control.fields.description", { defaultValue: "Description" }),
                                render: (item) => displayText(item.description),
                            },
                            {
                                key: "actions",
                                label: t("common.actions", { defaultValue: "Actions" }),
                                width: "10rem",
                                render: (item) => (
                                    <RowActions>
                                        <Button
                                            design="Transparent"
                                            disabled={saving}
                                            onClick={() => openEditDialog(item)}
                                        >
                                            {t("common.edit", { defaultValue: "Edit" })}
                                        </Button>
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
                accessibleName={
                    editingItem
                        ? t("control.documents.editTitle", { defaultValue: "Edit Document" })
                        : t("control.documents.createTitle", { defaultValue: "Add Document" })
                }
                style={{ width: "44rem", maxWidth: "96vw" }}
                onClose={() => setDialogOpen(false)}
                footer={
                    <>
                        <Button
                            design="Emphasized"
                            disabled={saving}
                            onClick={() => {
                                void handleSave();
                            }}
                        >
                            {t("common.save", { defaultValue: "Save" })}
                        </Button>
                        <Button design="Transparent" disabled={saving} onClick={() => setDialogOpen(false)}>
                            {t("common.cancel", { defaultValue: "Cancel" })}
                        </Button>
                    </>
                }
            >
                <ModalDialogHeader
                    title={
                        editingItem
                            ? t("control.documents.editTitle", { defaultValue: "Edit Document" })
                            : t("control.documents.createTitle", { defaultValue: "Add Document" })
                    }
                    onClose={() => setDialogOpen(false)}
                />

                <div style={{ display: "grid", gap: "1rem", padding: "0.25rem" }}>
                    {validationError ? (
                        <MessageStrip design="Negative" onClose={() => setValidationError(null)}>
                            {validationError}
                        </MessageStrip>
                    ) : null}

                    <div style={FORM_GRID_STYLE}>
                        <ControlFormField
                            label={t("control.fields.name", { defaultValue: "Name" })}
                            required
                        >
                            <Input
                                value={form.name}
                                disabled={saving}
                                onInput={(event) => handleChange("name", readInputValue(event))}
                            />
                        </ControlFormField>

                        <ControlFormField
                            label={t("control.fields.documentType", {
                                defaultValue: "Document Type",
                            })}
                        >
                            <Input
                                value={form.documentType}
                                disabled={saving}
                                onInput={(event) =>
                                    handleChange("documentType", readInputValue(event))
                                }
                            />
                        </ControlFormField>

                        <ControlFormField
                            label={t("control.fields.fileRef", { defaultValue: "File Reference" })}
                            fullWidth
                        >
                            <Input
                                value={form.fileRef}
                                disabled={saving}
                                onInput={(event) => handleChange("fileRef", readInputValue(event))}
                            />
                        </ControlFormField>

                        <ControlFormField
                            label={t("control.fields.description", { defaultValue: "Description" })}
                            fullWidth
                        >
                            <TextArea
                                rows={4}
                                value={form.description}
                                disabled={saving}
                                onInput={(event) => handleChange("description", readInputValue(event))}
                            />
                        </ControlFormField>
                    </div>
                </div>
            </Dialog>
        </>
    );
}

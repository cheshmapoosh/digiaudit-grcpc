import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Bar, Button, Input, Label, MessageStrip, Option, Select, TextArea, BusyIndicator } from "@ui5/webcomponents-react";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Link.js";

import type { ProcessNode, ProcessNodeStatus } from "../model/process.types";
import { processService } from "../service/process.service";
import ParentValueHelpDialog from "../components/ParentValueHelpDialog";

type Mode = "create" | "edit" | "view";
type ErrorKey = "DUPLICATE_CODE" | "NOT_FOUND" | "UNKNOWN";

const STATUSES: ProcessNodeStatus[] = ["ACTIVE", "INACTIVE"];

function required(v: string) {
    return v.trim().length > 0;
}

function getQueryParam(search: string, key: string): string | undefined {
    const v = new URLSearchParams(search).get(key);
    return v ? v : undefined;
}

function mapError(e: unknown): ErrorKey {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "DUPLICATE_CODE") return "DUPLICATE_CODE";
    if (msg === "NOT_FOUND") return "NOT_FOUND";
    return "UNKNOWN";
}

export default function ProcessObjectPage({
                                              mode,
                                              processId,
                                              onDone,
                                              onEdit,
                                              onView,
                                              onDelete,
                                              onCreateChild,
                                              onTreeFocusChange,
                                          }: {
    mode: Mode;
    processId?: string;
    onDone: () => void;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
    onDelete?: (id: string) => void;
    onCreateChild: (parentId: string) => void;
    onTreeFocusChange?: (id?: string) => void;
}) {
    const { t } = useTranslation();
    const location = useLocation();

    const parentIdFromQuery = useMemo(
        () => (mode === "create" ? getQueryParam(location.search, "parentId") : undefined),
        [location.search, mode]
    );

    const [loading, setLoading] = useState(false);
    const [busySave, setBusySave] = useState(false);
    const [errorKey, setErrorKey] = useState<ErrorKey | undefined>(undefined);

    const errorText = useMemo(() => {
        if (!errorKey) return "";
        if (errorKey === "DUPLICATE_CODE") return t("process.errors.duplicateCode", "کد تکراری است");
        if (errorKey === "NOT_FOUND") return t("process.errors.notFound", "رکورد یافت نشد");
        return t("common.error", "خطا");
    }, [errorKey, t]);

    // load list (for parent selection + label)
    const [allNodes, setAllNodes] = useState<ProcessNode[]>([]);

    // form state
    const [code, setCode] = useState("");
    const [title, setTitle] = useState("");
    const [status, setStatus] = useState<ProcessNodeStatus>("ACTIVE");
    const [parentId, setParentId] = useState<string | null>(null);
    const [description, setDescription] = useState<string | undefined>(undefined);

    const selectedParentLabel = useMemo(() => {
        if (!parentId) return t("common.none", "ندارد");
        const p = allNodes.find((x) => x.id === parentId);
        return p ? `${p.code ?? "-"} — ${p.title}` : "-";
    }, [allNodes, parentId, t]);

    const headerTitle = useMemo(() => {
        if (mode === "create") return parentIdFromQuery ? t("process.createChild.title", "ایجاد زیر فرآیند") : t("process.create.title", "ایجاد فرآیند");
        if (mode === "edit") return t("process.edit.title", "ویرایش فرآیند");
        return t("process.view.title", "نمایش فرآیند");
    }, [mode, parentIdFromQuery, t]);

    const objectKey = useMemo(() => {
        if (mode === "create") return t("common.new", "جدید");
        const k = `${code ?? ""} - ${title ?? ""}`.trim();
        return k.length > 3 ? k : (processId ?? "");
    }, [mode, code, title, processId, t]);

    const isReadOnly = mode === "view" || loading || busySave;

    const canSave = useMemo(() => {
        if (mode === "view") return false;
        return required(title) && !loading && !busySave;
    }, [mode, title, loading, busySave]);

    function payload() {
        return { parentId, title, code: code?.trim() ? code : undefined, status, description };
    }

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setErrorKey(undefined);

            try {
                const list = await (processService as any).list?.();
                const all = Array.isArray(list) ? list : [];
                if (!alive) return;

                setAllNodes(all);

                if (mode === "create") {
                    setCode("");
                    setTitle("");
                    setStatus("ACTIVE");
                    setDescription(undefined);

                    if (parentIdFromQuery && all.some((x) => x.id === parentIdFromQuery)) setParentId(parentIdFromQuery);
                    else setParentId(null);

                    return;
                }

                if (!processId) {
                    setErrorKey("NOT_FOUND");
                    return;
                }

                const found = all.find((x) => x.id === processId);
                if (!found) {
                    setErrorKey("NOT_FOUND");
                    return;
                }

                setCode(found.code ?? "");
                setTitle(found.title ?? "");
                setStatus(found.status ?? "ACTIVE");
                setParentId(found.parentId ?? null);
                setDescription(found.description);
            } catch {
                setErrorKey("UNKNOWN");
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [mode, processId, parentIdFromQuery]);

    async function handleSave() {
        if (mode === "view") return;

        setBusySave(true);
        setErrorKey(undefined);

        try {
            if (mode === "create") {
                const created = await processService.create(payload());
                onView(created.id);
                return;
            }

            if (!processId) {
                setErrorKey("NOT_FOUND");
                return;
            }

            await processService.update(processId, payload());
            onView(processId);
        } catch (e) {
            console.error("[process] save failed", {
                mode,
                processId,
                payload: payload(),
                error: e,
            });

            setErrorKey(mapError(e));
        } finally {
            setBusySave(false);
        }
    }

    function handleCancel() {
        if (mode === "edit" && processId) onView(processId);
        else onDone();
    }

    const [parentVhOpen, setParentVhOpen] = useState(false);

    return (
        <div className="page" style={{ height: "100%", minHeight: 0 }}>
            <div className="pageHeader" style={{ alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", opacity: 0.9 }}>
                        {/* @ts-ignore */}
                        <ui5-link
                            href="#"
                            onClick={(e: any) => {
                                e.preventDefault?.();
                                onDone();
                            }}
                        >
                            {t("nav.process", "فرآیندها")}
                        </ui5-link>
                        <span style={{ opacity: 0.6 }}>/</span>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{headerTitle}</span>
                    </div>

                    {/* @ts-ignore */}
                    <ui5-title level="H3" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {objectKey}
                    </ui5-title>

                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <Label style={{ opacity: 0.75 }}>{t("process.fields.status", "وضعیت")}:</Label>
                        <Label>{status}</Label>

                        <span style={{ opacity: 0.35 }}>•</span>

                        <Label style={{ opacity: 0.75 }}>{t("process.fields.parent", "والد")}:</Label>
                        <Label>{selectedParentLabel}</Label>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    {mode === "view" && processId && (
                        <>
                            <Button design="Default" icon="add" onClick={() => processId && onCreateChild(processId)}>
                                {t("process.actions.newChild", "ایجاد زیر فرآیند")}
                            </Button>

                            <Button icon="edit" design="Emphasized" onClick={() => onEdit(processId)}>
                                {t("common.edit", "ویرایش")}
                            </Button>

                            <Button design="Negative" icon="delete" disabled={!onDelete} onClick={() => onDelete?.(processId)}>
                                {t("common.delete", "حذف")}
                            </Button>
                        </>
                    )}

                    <Button icon="decline" design="Transparent" onClick={handleCancel} disabled={busySave}>
                        {t("common.back", "بازگشت")}
                    </Button>
                </div>
            </div>

            {!!errorKey && (
                <div style={{ paddingInline: 12 }}>
                    <MessageStrip design="Negative" hideCloseButton>
                        {errorText}
                    </MessageStrip>
                </div>
            )}

            <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 12, paddingBottom: mode === "view" ? 12 : 64 }}>
                {loading ? (
                    <BusyIndicator active style={{ width: "100%" }} />
                ) : (
                    <>
                        <div style={{ marginBottom: 10 }}>
                            {/* @ts-ignore */}
                            <ui5-title level="H4">{t("process.sections.general", "اطلاعات عمومی")}</ui5-title>
                        </div>

                        <div className="formGrid2">
                            <div>
                                <Label>{t("process.fields.code", "کد")}</Label>
                                <Input value={code} onInput={(e: any) => setCode(e.target.value)} disabled={isReadOnly} />
                            </div>

                            <div>
                                <Label required>{t("process.fields.title", "عنوان")}</Label>
                                <Input value={title} onInput={(e: any) => setTitle(e.target.value)} disabled={isReadOnly} />
                            </div>

                            <div>
                                <Label>{t("process.fields.status", "وضعیت")}</Label>
                                <Select
                                    value={status}
                                    disabled={isReadOnly}
                                    onChange={(e: any) => setStatus(e.detail.selectedOption.value as ProcessNodeStatus)}
                                >
                                    {STATUSES.map((x) => (
                                        <Option key={x} value={x}>
                                            {x}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <div className="formGridSpan2">
                                <Label>{t("process.fields.parent", "والد")}</Label>

                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <Input
                                        value={
                                            parentId
                                                ? (() => {
                                                    const p = allNodes.find((x) => x.id === parentId);
                                                    return p ? `${p.code ?? "-"} — ${p.title}` : parentId;
                                                })()
                                                : t("common.none", "ندارد")
                                        }
                                        readonly
                                        style={{ flex: 1, minWidth: 0 }}
                                    />

                                    <Button icon="value-help" design="Transparent" onClick={() => setParentVhOpen(true)} />

                                    <Button
                                        icon="sys-cancel"
                                        design="Transparent"
                                        disabled={!parentId}
                                        onClick={() => {
                                            setParentId(null);
                                            onTreeFocusChange?.(processId);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="formGridSpan2">
                                <Label>{t("process.fields.description", "توضیحات")}</Label>
                                <TextArea
                                    value={description ?? ""}
                                    onInput={(e: any) => setDescription(e.target.value || undefined)}
                                    disabled={isReadOnly}
                                    rows={5}
                                    style={{ width: "100%" }}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {mode !== "view" && (
                <div
                    style={{
                        position: "sticky",
                        bottom: 0,
                        zIndex: 10,
                        borderTop: "1px solid var(--sapList_BorderColor)",
                        background: "var(--sapBackgroundColor)",
                    }}
                >
                    <Bar
                        design="Footer"
                        endContent={
                            <>
                                <Button design="Emphasized" disabled={!canSave} onClick={handleSave}>
                                    {mode === "create" ? t("common.create", "ایجاد") : t("common.save", "ذخیره")}
                                </Button>
                                <Button design="Transparent" disabled={busySave} onClick={handleCancel}>
                                    {t("common.cancel", "انصراف")}
                                </Button>
                            </>
                        }
                    />
                </div>
            )}

            <ParentValueHelpDialog
                open={parentVhOpen}
                items={allNodes}
                excludedId={processId}
                selectedParentId={parentId}
                onCancel={() => setParentVhOpen(false)}
                onSelect={(node) => {
                    setParentVhOpen(false);

                    if (!node) {
                        setParentId(null);
                        onTreeFocusChange?.(processId);
                        return;
                    }

                    setParentId(node.id);
                    onTreeFocusChange?.(node.id);
                }}
            />
        </div>
    );
}
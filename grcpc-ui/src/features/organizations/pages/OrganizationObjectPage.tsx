// src/features/organization/pages/OrganizationObjectPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
    Bar,
    Button,
    DatePicker,
    Input,
    Label,
    MessageStrip,
    Option,
    Select,
    TextArea,
    BusyIndicator
} from "@ui5/webcomponents-react";

import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Link.js";

import type {
    Organization,
    OrganizationCreateInput,
    OrganizationStatus,
    OrganizationType
} from "../types";
import { organizationService } from "../api/organization.service";
import ParentValueHelpDialog from "../components/ParentValueHelpDialog";

type Mode = "create" | "edit" | "view";
type ErrorKey = "DUPLICATE_CODE" | "HAS_CHILDREN" | "NOT_FOUND" | "UNKNOWN";

const ORG_TYPES: OrganizationType[] = [
    "COMPANY",
    "BUSINESS_UNIT",
    "DIVISION",
    "DEPARTMENT",
    "COST_CENTER",
    "LOCATION",
    "OTHER"
];

const ORG_STATUSES: OrganizationStatus[] = ["ACTIVE", "INACTIVE"];

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
    if (msg === "HAS_CHILDREN") return "HAS_CHILDREN";
    if (msg === "NOT_FOUND") return "NOT_FOUND";
    return "UNKNOWN";
}

export default function OrganizationObjectPage({
                                                   mode,
                                                   orgId,
                                                   onDone,
                                                   onEdit,
                                                   onView,
                                                   onDelete,
                                                   onCreateChild,
                                                   onTreeFocusChange
                                               }: {
    mode: Mode;
    orgId?: string;
    onDone: () => void;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
    onDelete?: (id: string) => void;
    onCreateChild: (parentId: string) => void;
    onTreeFocusChange?: (id?: string) => void;
}) {
    const { t } = useTranslation();
    const location = useLocation();

    // create-child: /organizations/new?parentId=...
    const parentIdFromQuery = useMemo(
        () => (mode === "create" ? getQueryParam(location.search, "parentId") : undefined),
        [location.search, mode]
    );

    // loading/busy/errors
    const [loading, setLoading] = useState(false);
    const [busySave, setBusySave] = useState(false);
    const [errorKey, setErrorKey] = useState<ErrorKey | undefined>(undefined);


    const errorText = useMemo(() => {
        if (!errorKey) return "";
        if (errorKey === "DUPLICATE_CODE") return t("org.errors.duplicateCode", "کد تکراری است");
        if (errorKey === "HAS_CHILDREN") return t("org.errors.hasChildren", "این سازمان زیرمجموعه دارد و قابل حذف نیست");
        if (errorKey === "NOT_FOUND") return t("org.errors.notFound", "رکورد یافت نشد");
        return t("common.error", "خطا");
    }, [errorKey, t]);

    // list for parent selection + finding labels
    const [allOrgs, setAllOrgs] = useState<Organization[]>([]);

    const parents = useMemo(
        () => allOrgs.map((x) => ({ id: x.id, label: `${x.code} - ${x.name}` })),
        [allOrgs]
    );

    // form state
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [type, setType] = useState<OrganizationType>("DEPARTMENT");
    const [status, setStatus] = useState<OrganizationStatus>("ACTIVE");
    const [parentId, setParentId] = useState<string | undefined>(undefined);
    const [validFrom, setValidFrom] = useState<string | undefined>(undefined);
    const [validTo, setValidTo] = useState<string | undefined>(undefined);
    const [description, setDescription] = useState<string | undefined>(undefined);

    const selectedParentLabel = useMemo(() => {
        if (!parentId) return t("common.none", "ندارد");
        const p = allOrgs.find((x) => x.id === parentId);
        return p ? `${p.code} — ${p.name}` : "-";
    }, [allOrgs, parentId, t]);

    const headerTitle = useMemo(() => {
        if (mode === "create") {
            return parentIdFromQuery
                ? t("org.createChild.title", "ایجاد زیرمجموعه")
                : t("org.create.title", "ایجاد سازمان");
        }
        if (mode === "edit") return t("org.edit.title", "ویرایش سازمان");
        return t("org.view.title", "نمایش سازمان");
    }, [mode, parentIdFromQuery, t]);

    const objectKey = useMemo(() => {
        if (mode === "create") return t("common.new", "جدید");
        const k = `${code} - ${name}`.trim();
        return k.length > 3 ? k : (orgId ?? "");
    }, [mode, code, name, orgId, t]);

    const isReadOnly = mode === "view" || loading || busySave;

    const canSave = useMemo(() => {
        if (mode === "view") return false;
        return required(code) && required(name) && !loading && !busySave;
    }, [mode, code, name, loading, busySave]);

    function payload(): OrganizationCreateInput {
        return { code, name, type, status, parentId, validFrom, validTo, description };
    }

    // load list + load record (for edit/view) or defaults (for create)
    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setErrorKey(undefined);

            try {
                const list = await organizationService.list();
                if (!alive) return;
                setAllOrgs(list);

                if (mode === "create") {
                    // defaults
                    setCode("");
                    setName("");
                    setType("DEPARTMENT");
                    setStatus("ACTIVE");
                    setValidFrom(undefined);
                    setValidTo(undefined);
                    setDescription(undefined);

                    // apply parentId from query if valid
                    if (parentIdFromQuery && list.some((x) => x.id === parentIdFromQuery)) {
                        setParentId(parentIdFromQuery);
                    } else {
                        setParentId(undefined);
                    }
                    return;
                }

                // edit/view require orgId
                if (!orgId) {
                    setErrorKey("NOT_FOUND");
                    return;
                }

                const found = list.find((x) => x.id === orgId);
                if (!found) {
                    setErrorKey("NOT_FOUND");
                    return;
                }

                setCode(found.code);
                setName(found.name);
                setType(found.type);
                setStatus(found.status);
                setParentId(found.parentId);
                setValidFrom(found.validFrom);
                setValidTo(found.validTo);
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
    }, [mode, orgId, parentIdFromQuery]);

    const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);

    useEffect(() => {
        organizationService.list().then(setAllOrganizations);
    }, []);

    async function handleSave() {
        if (mode === "view") return;

        setBusySave(true);
        setErrorKey(undefined);

        try {
            if (mode === "create") {
                const created = await organizationService.create(payload());
                onView(created.id); // go to display after create
                return;
            }

            if (!orgId) {
                setErrorKey("NOT_FOUND");
                return;
            }

            await organizationService.update(orgId, payload());
            onView(orgId); // go back to display after save
        } catch (e) {
            setErrorKey(mapError(e));
        } finally {
            setBusySave(false);
        }
    }

    function handleCancel() {
        // SAP-like:
        // create => back to list
        // edit   => back to view
        // view   => back to list
        if (mode === "edit" && orgId) onView(orgId);
        else onDone();
    }

    const [parentVhOpen, setParentVhOpen] = useState(false);

    // ===== UI =====
    return (
        <div className="page" style={{ height: "100%", minHeight: 0 }}>
            {/* Header */}
            <div className="pageHeader" style={{ alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                    {/* Breadcrumb (minimal) */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center", opacity: 0.9 }}>
                        {/* @ts-ignore */}
                        <ui5-link
                            href="#"
                            onClick={(e: any) => {
                                e.preventDefault?.();
                                onDone();
                            }}
                        >
                            {t("nav.organization", "سازمان‌ها")}
                        </ui5-link>
                        <span style={{ opacity: 0.6 }}>/</span>
                        <span
                            style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                            }}
                        >
              {headerTitle}
            </span>
                    </div>

                    {/* Title */}
                    {/* @ts-ignore */}
                    <ui5-title
                        level="H3"
                        style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}
                    >
                        {objectKey}
                    </ui5-title>

                    {/* Subtitle / quick facts */}
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <Label style={{ opacity: 0.75 }}>{t("org.fields.status", "وضعیت")}:</Label>
                        <Label>{status}</Label>

                        <span style={{ opacity: 0.35 }}>•</span>

                        <Label style={{ opacity: 0.75 }}>{t("org.fields.parent", "والد")}:</Label>
                        <Label>{selectedParentLabel}</Label>
                    </div>
                </div>

                {/* Header actions */}
                <div style={{ display: "flex", gap: 8 }}>
                    {mode === "view" && orgId && (
                        <>
                            <Button
                                design="Default"
                                icon="add"
                                onClick={() => orgId && onCreateChild(orgId)}
                            >
                                {t("org.actions.newChild", "ایجاد زیرمجموعه")}
                            </Button>

                            <Button icon="edit" design="Emphasized" onClick={() => onEdit(orgId)}>
                                {t("common.edit", "ویرایش")}
                            </Button>

                            {mode === "view" && orgId && (
                                <Button
                                    design="Negative"
                                    icon="delete"
                                    disabled={!onDelete}
                                    onClick={() => onDelete?.(orgId)}
                                >
                                    {t("common.delete", "حذف")}
                                </Button>
                            )}
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

            {/* Content */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 12, paddingBottom: mode === "view" ? 12 : 64 }}>
                {loading ? (
                    <BusyIndicator active style={{ width: "100%" }} />
                ) : (
                    <>
                        {/* Section: General */}
                        <div style={{ marginBottom: 10 }}>
                            {/* @ts-ignore */}
                            <ui5-title level="H4">{t("org.sections.general", "اطلاعات عمومی")}</ui5-title>
                        </div>

                        {/* Responsive grid: 2 cols desktop, 1 col tablet/mobile (CSS handles) */}
                        <div className="formGrid2">
                            <div>
                                <Label required>{t("org.fields.code", "کد")}</Label>
                                <Input
                                    value={code}
                                    onInput={(e: any) => setCode(e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div>
                                <Label required>{t("org.fields.name", "نام")}</Label>
                                <Input
                                    value={name}
                                    onInput={(e: any) => setName(e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div>
                                <Label>{t("org.fields.type", "نوع")}</Label>
                                <Select
                                    value={type}
                                    disabled={isReadOnly}
                                    onChange={(e: any) => setType(e.detail.selectedOption.value as OrganizationType)}
                                >
                                    {ORG_TYPES.map((x) => (
                                        <Option key={x} value={x}>
                                            {x}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <Label>{t("org.fields.status", "وضعیت")}</Label>
                                <Select
                                    value={status}
                                    disabled={isReadOnly}
                                    onChange={(e: any) => setStatus(e.detail.selectedOption.value as OrganizationStatus)}
                                >
                                    {ORG_STATUSES.map((x) => (
                                        <Option key={x} value={x}>
                                            {x}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <div className="formGridSpan2">
                                <Label>{t("org.fields.parent", "والد")}</Label>

                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <Input
                                        value={
                                            parentId
                                                ? (() => {
                                                    const p = allOrganizations.find((x) => x.id === parentId);
                                                    return p ? `${p.code} — ${p.name}` : parentId;
                                                })()
                                                : t("common.none", "ندارد")
                                        }
                                        readonly
                                        style={{ flex: 1, minWidth: 0 }}
                                    />

                                    <Button
                                        icon="value-help"
                                        design="Transparent"
                                        onClick={() => setParentVhOpen(true)}
                                    />

                                    <Button
                                        icon="sys-cancel"
                                        design="Transparent"
                                        disabled={!parentId}
                                        onClick={() => {
                                            setParentId(undefined);
                                            onTreeFocusChange?.(orgId);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Validity */}
                        <div style={{ margin: "18px 0 10px" }}>
                            {/* @ts-ignore */}
                            <ui5-title level="H4">{t("org.sections.validity", "اعتبار")}</ui5-title>
                        </div>

                        <div className="formGrid2">
                            <div>
                                <Label>{t("org.fields.validFrom", "تاریخ شروع")}</Label>
                                <DatePicker
                                    value={validFrom ?? ""}
                                    onChange={(e: any) => setValidFrom(e.target.value || undefined)}
                                    disabled={isReadOnly}
                                    style={{ width: "100%" }}
                                />
                            </div>

                            <div>
                                <Label>{t("org.fields.validTo", "تاریخ پایان")}</Label>
                                <DatePicker
                                    value={validTo ?? ""}
                                    onChange={(e: any) => setValidTo(e.target.value || undefined)}
                                    disabled={isReadOnly}
                                    style={{ width: "100%" }}
                                />
                            </div>

                            <div className="formGridSpan2">
                                <Label>{t("org.fields.description", "توضیحات")}</Label>
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

            {/* Sticky footer only for create/edit */}
            {mode !== "view" && (
                <div
                    style={{
                        position: "sticky",
                        bottom: 0,
                        zIndex: 10,
                        borderTop: "1px solid var(--sapList_BorderColor)",
                        background: "var(--sapBackgroundColor)"
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
                items={allOrganizations}
                excludedId={orgId} // جلوگیری از انتخاب خودش
                selectedParentId={parentId}
                onCancel={() => setParentVhOpen(false)}
                onSelect={(org) => {
                    setParentVhOpen(false);

                    if (!org) {
                        setParentId(undefined);
                        onTreeFocusChange?.(orgId);
                        return;
                    }

                    setParentId(org.id);

                    // 🔥 sync با Tree
                    onTreeFocusChange?.(org.id);
                }}
            />

        </div>
    );
}

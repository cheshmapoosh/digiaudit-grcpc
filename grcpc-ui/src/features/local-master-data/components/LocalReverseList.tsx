import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, MessageStrip, Option, Select, Title } from "@ui5/webcomponents-react";
import { useAuthState } from "@/features/auth/state/auth.state";
import { canAccessMasterData, type MasterDataArea } from "@/features/master-data/security/masterDataAccess";
import type {
    LocalBaseRow, LocalPage, LocalRows, LocalSectionKey, LocalStatus,
} from "../domain/local.model";
import { LOCAL_SECTION_BY_KEY } from "../domain/local.sections";
import { localApi } from "../infra/local.api.repo";

interface Props<K extends LocalSectionKey> {
    parentId: string;
    path: string;
    section: K;
    titleKey: string;
    titleFa: string;
    areas: MasterDataArea[];
}

function projection(row: LocalBaseRow): string {
    const fields = row as unknown as Record<string, unknown>;
    const labels = ["riskTemplateLabel", "controlObjectiveLabel", "requirementLabel",
        "controlLabel", "policyLabel"].map((name) => fields[name])
        .filter((value): value is string => typeof value === "string" && value.length > 0);
    return labels.join(" · ");
}

export default function LocalReverseList<K extends LocalSectionKey>({
    parentId, path, section, titleKey, titleFa, areas,
}: Props<K>) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const me = useAuthState((state) => state.me);
    const allowed = canAccessMasterData(me, "REFERENCE")
        && areas.every((area) => canAccessMasterData(me, area));
    const [status, setStatus] = useState<LocalStatus | null>(null);
    const [page, setPage] = useState(0);
    const [result, setResult] = useState<LocalPage<LocalRows[K]> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const load = useCallback(async () => {
        if (!allowed || !parentId) return;
        setLoading(true);
        try {
            const rows = await localApi.reverse<K>(path, status, page);
            setResult(rows);
            setError(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message
                : t("local.errors.list", { defaultValue: "فهرست بارگذاری نشد." }));
        } finally {
            setLoading(false);
        }
    }, [allowed, parentId, path, status, page, t]);

    useEffect(() => { void load(); }, [load, reloadKey]);

    const open = (row: LocalBaseRow) => {
        const fields = row as unknown as Record<string, unknown>;
        const params = new URLSearchParams({
            tab: LOCAL_SECTION_BY_KEY[section].tab,
            localSection: section,
            localRowId: row.id,
        });
        if (typeof fields.organizationSubprocessScopeId === "string") {
            params.set("contextId", fields.organizationSubprocessScopeId);
        }
        if (section === "contexts") params.set("contextId", row.id);
        if (section === "control-policies"
            && typeof fields.localControlScopeId === "string") {
            params.set("policyTargetId", fields.localControlScopeId);
        }
        if (section === "requirement-policies"
            && typeof fields.localRequirementScopeId === "string") {
            params.set("policyTargetId", fields.localRequirementScopeId);
        }
        if (row.status === "DELETED") params.set("localStatus", "DELETED");
        navigate(`/organizations/${row.organizationId}?${params.toString()}`);
    };

    if (!allowed) return null;
    return <section style={{ display: "grid", gap: "0.7rem",
        border: "1px solid var(--sapGroup_ContentBorderColor)", padding: "0.75rem" }}>
        <Title level="H5">{t(titleKey, { defaultValue: titleFa })}</Title>
        <MessageStrip design="Information" hideCloseButton>
            {t("local.reverse.readOnly", {
                defaultValue: "این فهرست فقط برای مشاهده است؛ ویرایش از صفحهٔ سازمان انجام می‌شود.",
            })}
        </MessageStrip>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Select value={status ?? ""}
                accessibleName={t("local.statusFilter", { defaultValue: "وضعیت فهرست" })}
                onChange={(event) => {
                    setStatus(event.target.value as LocalStatus || null);
                    setPage(0);
                }}>
                <Option value="">{t("local.status.allCurrent", {
                    defaultValue: "فعال و غیرفعال",
                })}</Option>
                <Option value="ACTIVE">{t("local.status.ACTIVE", { defaultValue: "فعال" })}</Option>
                <Option value="INACTIVE">{t("local.status.INACTIVE", {
                    defaultValue: "غیرفعال",
                })}</Option>
                <Option value="DELETED">{t("local.status.DELETED", {
                    defaultValue: "حذف‌شده",
                })}</Option>
            </Select>
            <Button design="Transparent" disabled={loading}
                onClick={() => setReloadKey((key) => key + 1)}>
                {t("local.retry", { defaultValue: "بارگذاری مجدد" })}</Button>
        </div>
        {loading ? <MessageStrip design="Information" hideCloseButton>
            {t("local.loading", { defaultValue: "در حال بارگذاری..." })}
        </MessageStrip> : null}
        {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
        {result?.items.map((row) => <div key={row.id} style={{
            display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap",
        }}>
            <span>{row.organizationCode} — {row.organizationLabel}
                {projection(row) ? ` · ${projection(row)}` : ""}
                {" · "}{row.status}</span>
            <Button design="Transparent" onClick={() => open(row)}>
                {t("local.reverse.open", { defaultValue: "نمایش در سازمان" })}</Button>
        </div>)}
        {result && result.items.length === 0 ? <MessageStrip design="Information" hideCloseButton>
            {t("local.empty", { defaultValue: "ردیفی برای این بخش وجود ندارد." })}
        </MessageStrip> : null}
        {result ? <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <Button design="Transparent" disabled={page === 0 || loading}
                onClick={() => setPage((value) => value - 1)}>
                {t("local.options.previous", { defaultValue: "قبلی" })}</Button>
            <span>{page + 1} / {Math.max(1, result.totalPages)}</span>
            <Button design="Transparent"
                disabled={loading || page + 1 >= result.totalPages}
                onClick={() => setPage((value) => value + 1)}>
                {t("local.options.next", { defaultValue: "بعدی" })}</Button>
        </div> : null}
    </section>;
}

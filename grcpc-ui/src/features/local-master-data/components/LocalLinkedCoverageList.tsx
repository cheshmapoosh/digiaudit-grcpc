import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, MessageStrip, Title } from "@ui5/webcomponents-react";
import type { LocalBaseRow, LocalPage, LocalRows, LocalSectionKey } from "../domain/local.model";
import { localApi } from "../infra/local.api.repo";

interface Props<K extends LocalSectionKey> {
    section: K;
    organizationId: string;
    contextId: string;
    labelKey: string;
    labelFa: string;
    onOpen: (section: K, row: LocalBaseRow) => void;
}

function label(row: LocalBaseRow): string {
    const value = row as unknown as Record<string, unknown>;
    return ["riskTemplateCode", "requirementCode", "controlCode", "controlObjectiveCode"]
        .map((key) => value[key])
        .filter((item): item is string => typeof item === "string" && item.length > 0)
        .join(" — ") || row.id;
}

export default function LocalLinkedCoverageList<K extends LocalSectionKey>({
    section, organizationId, contextId, labelKey, labelFa, onOpen,
}: Props<K>) {
    const { t } = useTranslation();
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState<LocalPage<LocalRows[K]> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;
        queueMicrotask(() => { if (active) setLoading(true); });
        void localApi.list(section, { organizationId, contextId }, null, page)
            .then((result) => {
                if (!active) return;
                setRows(result);
                setError(null);
            })
            .catch((cause: unknown) => {
                if (!active) return;
                setError(cause instanceof Error ? cause.message
                    : t("local.errors.list", { defaultValue: "فهرست بارگذاری نشد." }));
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [section, organizationId, contextId, page, t]);

    return <section style={{ display: "grid", gap: "0.5rem",
        borderTop: "1px solid var(--sapGroup_ContentBorderColor)", paddingTop: "0.7rem" }}>
        <Title level="H6">{t(labelKey, { defaultValue: labelFa })}</Title>
        {loading ? <MessageStrip design="Information" hideCloseButton>
            {t("local.loading", { defaultValue: "در حال بارگذاری..." })}
        </MessageStrip> : null}
        {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
        {rows?.items.map((row) => <div key={row.id}
            style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span>{label(row)} · {row.status}</span>
            <Button design="Transparent" onClick={() => onOpen(section, row)}>
                {t("local.reverse.open", { defaultValue: "نمایش در سازمان" })}
            </Button>
        </div>)}
        {rows && rows.items.length === 0 ? <MessageStrip design="Information" hideCloseButton>
            {t("local.empty", { defaultValue: "ردیفی برای این بخش وجود ندارد." })}
        </MessageStrip> : null}
        {rows ? <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <Button design="Transparent" disabled={page === 0 || loading}
                onClick={() => setPage((current) => current - 1)}>
                {t("local.options.previous", { defaultValue: "قبلی" })}
            </Button>
            <span>{page + 1} / {Math.max(1, rows.totalPages)}</span>
            <Button design="Transparent" disabled={loading || page + 1 >= rows.totalPages}
                onClick={() => setPage((current) => current + 1)}>
                {t("local.options.next", { defaultValue: "بعدی" })}
            </Button>
        </div> : null}
    </section>;
}

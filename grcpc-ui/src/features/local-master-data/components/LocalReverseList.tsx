import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageStrip } from "@ui5/webcomponents-react";
import { useAuthState } from "@/features/auth/state/auth.state";
import { canAccessMasterData, type MasterDataArea } from "@/features/master-data/security/masterDataAccess";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { LocalBaseRow, LocalRows, LocalSectionKey } from "../domain/local.model";
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


export default function LocalReverseList<K extends LocalSectionKey>({ parentId, path, titleKey, titleFa, areas }: Props<K>) {
  const { t } = useTranslation(); const me = useAuthState(state => state.me);
  const allowed = canAccessMasterData(me, "REFERENCE") && areas.every(area => canAccessMasterData(me, area));
  const [rows, setRows] = useState<LocalRows[K][]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false); const [reload, setReload] = useState(0);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  useEffect(() => {
    if (!allowed || !parentId) return;
    let current = true;
    void Promise.resolve().then(async () => {
      setLoading(true);
      try {
        const first = await localApi.reverse<K>(path, null, 0);
        const result = [...first.items];
        for (let page = 1; page < first.totalPages; page += 1) {
          const next = await localApi.reverse<K>(path, null, page);
          if (!current) return;
          result.push(...next.items);
        }
        if (current) { setRows(result.filter(row => row.status !== "DELETED")); setError(false); }
      } catch { if (current) setError(true); }
      finally { if (current) setLoading(false); }
    });
    return () => { current = false; };
  }, [allowed, parentId, path, reload]);
  const visible = rows.filter(row => row.status !== "DELETED" && (filter === "ALL" || row.status === filter) && `${row.organizationCode} ${row.organizationLabel} ${projection(row)}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const columns: CatalogRelationColumn<LocalRows[K]>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.organizationCode },
    { key: "name", header: t("catalogRelation.name"), cell: row => row.organizationLabel },
    { key: "projection", header: t(titleKey, { defaultValue: titleFa }), cell: row => projection(row) || "—" },
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} /> },
    { key: "validFrom", header: t("catalogRelation.validFrom"), cell: row => formatPersianDate(row.validFrom) },
    { key: "validTo", header: t("catalogRelation.validTo"), cell: row => formatPersianDate(row.validTo) },
  ];
  if (!allowed) return null;
  return <section><CatalogRelationToolbar title={t(titleKey, { defaultValue: titleFa })} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
    <MessageStrip design="Information" hideCloseButton>{t("local.reverse.readOnly")}</MessageStrip>
    {error ? <MessageStrip design="Negative" hideCloseButton>{t("local.errors.list")}<CatalogActionButton onClick={() => setReload(value => value + 1)}>{t("catalogRelation.retry")}</CatalogActionButton></MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.id} accessibleName={t(titleKey, { defaultValue: titleFa })} loading={loading} emptyText={t("catalogRelation.empty")} />
  </section>;
}

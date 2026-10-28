import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, MessageStrip, ObjectStatus } from "@ui5/webcomponents-react";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import type { DerivedSubprocessAccountGroup } from "../domain/controlAccountGroup.model";
import { controlAccountGroupApi } from "../infra/controlAccountGroup.api";
import { useClassificationDestinationPermissions, useControlAccountGroupPermissions } from "../security/controlAccountGroupPermissions";
import { controlAccountGroupErrorMessage } from "../utils/controlAccountGroupError";
import { useControlScopePermissions } from "@/features/control-scope";
import { useControlObjectiveScopePermissions } from "@/features/control-objective-scope";
import { useControlObjectiveAccountGroupPermissions } from "@/features/control-objective-account-group";
import "../control-account-group.css";

export default function SubprocessAccountGroupsTab({ subprocessId, allowNestedNavigation = true }: { subprocessId: string; allowNestedNavigation?: boolean }) {
  const { t } = useTranslation();
  const controlClassifications = useControlAccountGroupPermissions();
  const objectiveClassifications = useControlObjectiveAccountGroupPermissions();
  const controlScopes = useControlScopePermissions();
  const objectiveScopes = useControlObjectiveScopePermissions();
  const destinations = useClassificationDestinationPermissions();
  const canReadControlPath = controlClassifications.view && controlScopes.view;
  const canReadObjectivePath = objectiveClassifications.view && objectiveScopes.view;
  const canRead = canReadControlPath || canReadObjectivePath;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  const [rows, setRows] = useState<DerivedSubprocessAccountGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    if (!canRead) return () => controller.abort();
    void controlAccountGroupApi.forSubprocess(subprocessId, controller.signal)
      .then(setRows)
      .catch((cause) => { if (!(cause instanceof Error && cause.name === "AbortError")) setError(controlAccountGroupErrorMessage(cause, t)); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [canRead, subprocessId, t]);
  if (!canRead) return <MessageStrip design="Information">{t("controlAccountGroup.errors.forbidden")}</MessageStrip>;
  const visible = rows.filter(row => row.accountGroupStatus !== "DELETED" && (filter === "ALL" || row.accountGroupStatus === filter) && `${row.accountGroupCode} ${row.accountGroupTitle}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const columns: CatalogRelationColumn<DerivedSubprocessAccountGroup>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.accountGroupCode },
    { key: "name", header: t("catalogRelation.name"), cell: row => allowNestedNavigation && destinations.accountGroupView ? <Link href="/account-groups">{row.accountGroupTitle}</Link> : row.accountGroupTitle },
    { key: "status", header: t("controlAccountGroup.derived.accountGroupStatus"), cell: row => <ObjectStatus state={row.accountGroupStatus === "ACTIVE" ? "Positive" : "None"}>{t(`controlAccountGroup.accountGroupStatus.${row.accountGroupStatus}`)}</ObjectStatus> },
    { key: "controls", header: t("controlAccountGroup.derived.contributingControls"), cell: row => <div className="controlAccountGroupContributionList">{row.contributingControls.map(source => <span key={source.classificationId}>{allowNestedNavigation && destinations.controlView ? <Link href={`/controls/${source.controlId}`}>{source.controlCode} — {source.controlTitle}</Link> : source.controlCode + " — " + source.controlTitle} <ObjectStatus state={source.controlScopeStatus === "ACTIVE" && source.classificationStatus === "ACTIVE" ? "Positive" : "None"}>{t("controlAccountGroup.derived.sourceStatus", { scope: t(`controlAccountGroup.status.${source.controlScopeStatus}`), classification: t(`controlAccountGroup.status.${source.classificationStatus}`) })}</ObjectStatus></span>)}</div> },
    { key: "objectives", header: t("controlAccountGroup.derived.contributingControlObjectives"), cell: row => <div className="controlAccountGroupContributionList">{row.contributingControlObjectives.map(source => <span key={source.classificationId}>{allowNestedNavigation && destinations.controlObjectiveView ? <Link href={`/control-objectives/${source.controlObjectiveId}`}>{source.controlObjectiveCode} — {source.controlObjectiveTitle}</Link> : source.controlObjectiveCode + " — " + source.controlObjectiveTitle} <ObjectStatus state={source.controlObjectiveScopeStatus === "ACTIVE" && source.classificationStatus === "ACTIVE" ? "Positive" : "None"}>{t("controlAccountGroup.derived.sourceStatus", { scope: t(`controlAccountGroup.status.${source.controlObjectiveScopeStatus}`), classification: t(`controlAccountGroup.status.${source.classificationStatus}`) })}</ObjectStatus></span>)}</div> },
  ];
  return <section className="controlAccountGroupTab"><CatalogRelationToolbar title={t("controlAccountGroup.derived.title")} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
    {error ? <MessageStrip design="Negative">{error}</MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.accountGroupId} accessibleName={t("controlAccountGroup.derived.title")} loading={loading} emptyText={t("catalogRelation.empty")} />
  </section>;
}

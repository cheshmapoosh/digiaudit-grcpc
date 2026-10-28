import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, MessageStrip, ObjectStatus, Text } from "@ui5/webcomponents-react";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { DialogFooterBar } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { currentProfile } from "@/features/dataset-profile/state/profile.state";
import { organizationService } from "../service/organization.service";
import type { OrganizationOwnerAssignment, OrganizationOwnerChange, OrganizationOwnerOption } from "../domain/organization.model";
import "./organizationOwners.css";

interface Props {
  organizationId?: string | null;
  rows: OrganizationOwnerAssignment[];
  changes: OrganizationOwnerChange[];
  onChange: (changes: OrganizationOwnerChange[]) => void;
  onPendingChange: (dirty: boolean) => void;
  onReadyChange?: (ready: boolean) => void;
  editable: boolean;
  busy: boolean;
}
type DisplayRow = Omit<OrganizationOwnerAssignment, "status"> & { status: "ACTIVE" | "INACTIVE" | "DELETED"; change?: OrganizationOwnerChange };
export default function OrganizationOwnersTab({ organizationId, rows, changes, onChange, onPendingChange, onReadyChange, editable, busy }: Props) {
  const { t } = useTranslation();
  const beforeDelete = useRef<Record<string, OrganizationOwnerChange | undefined>>({});
  const [options, setOptions] = useState<OrganizationOwnerOption[]>([]);
  const [optionSnapshots, setOptionSnapshots] = useState<OrganizationOwnerOption[]>([]);
  const [deleted, setDeleted] = useState<OrganizationOwnerAssignment[]>([]);
  const [loading, setLoading] = useState(false); const [reload, setReload] = useState(0);
  const [error, setError] = useState<string | null>(null); const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(""); const [pickerSearch, setPickerSearch] = useState("");
  const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set()); const [picked, setPicked] = useState<Set<string>>(new Set());
  const profile = currentProfile();
  useEffect(() => {
    if (!editable) return;
    let current = true;
    void Promise.resolve().then(async () => {
      setLoading(true);
      try {
        const [choices, removed] = await Promise.all([organizationService.ownerOptions(), organizationId ? organizationService.deletedOwners(organizationId) : Promise.resolve([])]);
        if (current) { setOptions(choices); setOptionSnapshots(previous => [...choices, ...previous.filter(option => !choices.some(choice => choice.id === option.id))]); setDeleted(removed); setError(null); }
      } catch { if (current) setError(t("organization.owners.loadError")); }
      finally { if (current) setLoading(false); }
    });
    return () => { current = false; };
  }, [editable, organizationId, reload, t]);
  useEffect(() => onPendingChange(open), [onPendingChange, open]);
  useEffect(() => onReadyChange?.(!editable || !loading && !error && !open), [onReadyChange, editable, loading, error, open]);
  const allRows = useMemo(() => [...rows, ...deleted.filter(row => !rows.some(current => current.userId === row.userId))], [rows, deleted]);
  const displayed = useMemo<DisplayRow[]>(() => {
    const result = allRows.map(row => {
      const change = changes.find(change => change.userId === row.userId);
      const status = change?.operation === "DELETE" ? "DELETED" : change?.operation === "INACTIVATE" ? "INACTIVE" : change ? "ACTIVE" : row.status;
      return { ...row, status, change };
    });
    for (const change of changes) {
      if (result.some(row => row.userId === change.userId)) continue;
      const option = optionSnapshots.find(item => item.id === change.userId);
      if (!option) continue;
      result.push({ assignmentId: "", profileId: profile?.id ?? "", organizationId: organizationId ?? "", userId: option.id, displayLabel: option.displayLabel,
        username: option.username, roleCode: option.roleCode, eligible: options.some(item => item.id === option.id), version: 0, status: "ACTIVE", change });
    }
    return result;
  }, [allRows, changes, options, optionSnapshots, organizationId, profile?.id]);
  const visible = displayed.filter(row => row.change || row.status !== "DELETED" && (filter === "ALL" || row.status === filter) && `${row.displayLabel} ${row.username}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const choices = options.filter(option => !displayed.some(row => row.userId === option.id && row.status !== "DELETED") && `${option.displayLabel} ${option.username}`.toLocaleLowerCase().includes(pickerSearch.trim().toLocaleLowerCase()));
  const role = (code: string | null) => code ? t(`organization.owners.roles.${code}`, { defaultValue: code }) : "—";
  const close = () => { if (!busy) { setOpen(false); setPicked(new Set()); } };
  const stageSelection = () => {
    const next = [...changes];
    for (const userId of picked) {
      if (!options.some(option => option.id === userId)) continue;
      const index = next.findIndex(change => change.userId === userId);
      const baseline = allRows.find(row => row.userId === userId);
      if (index >= 0 && next[index].operation === "DELETE") { const previous = beforeDelete.current[userId]; if (previous) next[index] = previous; else next.splice(index, 1); delete beforeDelete.current[userId]; continue; }
      if (index >= 0 || baseline && baseline.status !== "DELETED") continue;
      next.push(baseline ? { operation: "RESTORE", userId, assignmentId: baseline.assignmentId, version: baseline.version } : { operation: "CREATE_OR_RESTORE", userId });
    }
    onChange(next); close();
  };
  const affected = (status: "ACTIVE" | "INACTIVE" | "DELETED") => displayed.filter(row => selected.has(row.userId) && (status === "DELETED"
    ? row.status !== "DELETED" : Boolean(row.assignmentId && allRows.find(baseline => baseline.userId === row.userId)?.status !== "DELETED" && row.status !== "DELETED" && row.status !== status && (status !== "ACTIVE" || row.eligible))));
  const batch = (status: "ACTIVE" | "INACTIVE" | "DELETED") => {
    const affectedRows = affected(status); const keys = new Set(affectedRows.map(row => row.userId));
    const next = changes.filter(change => !keys.has(change.userId));
    for (const row of affectedRows) {
      const baseline = allRows.find(item => item.userId === row.userId);
      if (!baseline || baseline.status === "DELETED") continue;
      if (baseline.status === status) continue;
      if (status === "DELETED") beforeDelete.current[row.userId] = row.change;
      next.push({ operation: status === "DELETED" ? "DELETE" : status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE", userId: row.userId, assignmentId: baseline.assignmentId, version: baseline.version });
    }
    onChange(next);
  };
  const columns: CatalogRelationColumn<DisplayRow>[] = [
    { key: "username", header: t("organization.owners.username"), cell: row => row.username },
    { key: "name", header: t("organization.owners.user"), cell: row => row.displayLabel },
    { key: "role", header: t("organization.owners.role"), cell: row => role(row.roleCode) },
    { key: "eligibility", header: t("organization.owners.eligibility"), cell: row => <ObjectStatus state={row.eligible ? "Positive" : "Negative"}>{t(row.eligible ? "organization.owners.eligible" : "organization.owners.ineligible")}</ObjectStatus> },
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} draft={!row.change ? null : row.change.operation === "DELETE" ? "delete" : row.change.operation === "INACTIVATE" ? "inactive" : row.change.operation === "ACTIVATE" ? "active" : "new"} /> },
  ];
  const pickerColumns: CatalogRelationColumn<OrganizationOwnerOption>[] = [
    { key: "username", header: t("organization.owners.username"), cell: row => row.username },
    { key: "name", header: t("organization.owners.user"), cell: row => row.displayLabel },
    { key: "role", header: t("organization.owners.role"), cell: row => role(row.roleCode) },
  ];
  return <section className="organizationOwnersTab">
    <CatalogRelationToolbar title={t("organization.owners.title")} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} editable={editable} busy={busy || loading}
      canSelect={!error} onSelect={() => { setOpen(true); setPicked(new Set()); setPickerSearch(""); setReload(value => value + 1); }}
      canActivate={affected("ACTIVE").length > 0} onActivate={() => batch("ACTIVE")} canInactivate={affected("INACTIVE").length > 0} onInactivate={() => batch("INACTIVE")} canDelete={affected("DELETED").length > 0} onDelete={() => batch("DELETED")} />
    <Text>{t("basicData.profile")}: {profile?.name ?? "—"}</Text>
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}<Button onClick={() => setReload(value => value + 1)}>{t("catalogRelation.retry")}</Button></MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.userId} accessibleName={t("organization.owners.title")} selectable={editable} selectedKeys={selected} onSelectionChange={setSelected} loading={loading} busy={busy} emptyText={t("organization.owners.empty")} />
    <Dialog open={open} accessibleName={t("organization.owners.select")} className="organizationOwnersDialog catalogObjectDialog" onClose={close}
      footer={<DialogFooterBar><Button design="Emphasized" disabled={busy || loading || Boolean(error) || !picked.size} onClick={stageSelection}>{t("catalogRelation.select")}</Button><Button design="Transparent" disabled={busy} onClick={close}>{t("common.cancel")}</Button></DialogFooterBar>}>
      <ModalDialogHeader title={t("organization.owners.select")} onClose={close} actions={<HeaderSearch value={pickerSearch} onChange={setPickerSearch} disabled={busy} accessibleName={t("organization.owners.search")} />} />
      <div data-catalog-dialog-content>
      <Text>{t("organization.owners.eligibilityHint")}</Text>
      {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
      <CatalogRelationTable rows={choices} columns={pickerColumns} rowKey={row => row.id} accessibleName={t("organization.owners.select")} selectable selectedKeys={picked} onSelectionChange={setPicked} loading={loading} busy={busy} emptyText={t("organization.owners.noOptions")} />
      </div>
    </Dialog>
  </section>;
}

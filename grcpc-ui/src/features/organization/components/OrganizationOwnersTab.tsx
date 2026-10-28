import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Dialog, FlexBox, MessageStrip, ObjectStatus, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, TableSelectionMulti, Text, Title } from "@ui5/webcomponents-react";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { DialogFooterBar } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { currentProfile } from "@/features/dataset-profile/state/profile.state";
import { organizationService } from "../service/organization.service";
import type { OrganizationOwnerAssignment, OrganizationOwnerChange, OrganizationOwnerOption } from "../domain/organization.model";
import "./organizationOwners.css";

interface Props {
  rows: OrganizationOwnerAssignment[];
  changes: OrganizationOwnerChange[];
  onChange: (changes: OrganizationOwnerChange[]) => void;
  onPendingChange: (dirty: boolean) => void;
  editable: boolean;
  busy: boolean;
}

export default function OrganizationOwnersTab({ rows, changes, onChange, onPendingChange, editable, busy }: Props) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<OrganizationOwnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshGeneration, setRefreshGeneration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const profile = currentProfile();
  useEffect(() => {
    if (!editable) return;
    let current = true;
    void organizationService.ownerOptions().then((items) => {
      if (current) { setOptions(items); setLoading(false); setError(null); }
    }).catch((error: unknown) => {
      if (current) { setLoading(false); setError(error instanceof Error ? error.message : t("organization.owners.loadError")); }
    });
    return () => { current = false; };
  }, [editable, refreshGeneration, t]);
  useEffect(() => { onPendingChange(open && picked.size > 0); }, [onPendingChange, open, picked]);
  const displayed = useMemo(() => [
    ...rows.map((row) => ({ ...row, pending: changes.some((change) => change.userId === row.userId && change.operation === "DELETE") ? "DELETE" : null })),
    ...changes.filter((change) => change.operation === "CREATE_OR_RESTORE").map((change) => {
      const option = options.find((item) => item.id === change.userId);
      return { assignmentId: "", userId: change.userId, displayLabel: option?.displayLabel ?? change.userId,
        username: option?.username ?? "", roleCode: option?.roleCode ?? null, eligible: true, version: 0, pending: "ADD" };
    }),
  ], [changes, options, rows]);
  const query = search.trim().toLocaleLowerCase();
  const choices = options.filter((option) => !displayed.some((row) => row.userId === option.id && row.pending !== "DELETE")
    && (!query || `${option.displayLabel} ${option.username}`.toLocaleLowerCase().includes(query)));
  const role = (code: string | null) => code ? t(`organization.owners.roles.${code}`, { defaultValue: code }) : "—";
  const close = () => { setOpen(false); setPicked(new Set()); };
  const add = () => {
    const next = changes.filter((change) => !picked.has(change.userId));
    for (const userId of picked) if (!rows.some((row) => row.userId === userId)) next.push({ operation: "CREATE_OR_RESTORE", userId });
    onChange(next); close();
  };
  const remove = () => {
    const next = changes.filter((change) => !selected.has(change.userId));
    for (const row of rows) if (selected.has(row.userId)) next.push({ operation: "DELETE", userId: row.userId, assignmentId: row.assignmentId, version: row.version });
    onChange(next); setSelected(new Set());
  };
  return <FlexBox direction="Column" className="organizationOwnersTab">
    <Bar startContent={<Title level="H5">{t("organization.owners.title")}</Title>} endContent={editable ? <>
      <Button icon="add" design="Emphasized" disabled={busy || loading} onClick={() => { setPicked(new Set()); setSearch(""); setLoading(true); setError(null); setRefreshGeneration((current) => current + 1); setOpen(true); }}>{t("common.add")}</Button>
      <Button icon="delete" design="Negative" disabled={busy || !displayed.some((row) => selected.has(row.userId) && row.pending !== "DELETE")} onClick={remove}>{t("common.delete")}</Button>
    </> : undefined} />
    <Text>{t("basicData.profile")}: {profile?.name ?? "—"}</Text>
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
    {changes.length ? <MessageStrip design="Information" hideCloseButton>{t("organization.owners.saveHint")}</MessageStrip> : null}
    <Table accessibleName={t("organization.owners.title")} noDataText={t("organization.owners.empty")} inert={busy}
      features={editable ? <TableSelectionMulti selected={[...selected].join(" ")} onChange={(event) => { if (!busy) setSelected(event.target.getSelectedAsSet()); }} /> : undefined}
      headerRow={<TableHeaderRow>
        <TableHeaderCell>{t("organization.owners.user")}</TableHeaderCell><TableHeaderCell>{t("organization.owners.username")}</TableHeaderCell>
        <TableHeaderCell>{t("organization.owners.role")}</TableHeaderCell><TableHeaderCell>{t("common.status")}</TableHeaderCell>
        {editable ? <TableHeaderCell>{t("common.actions")}</TableHeaderCell> : null}
      </TableHeaderRow>}>
      {displayed.map((row) => <TableRow key={row.userId} rowKey={row.userId}>
        <TableCell><Text>{row.displayLabel}</Text></TableCell><TableCell><Text>{row.username}</Text></TableCell><TableCell><Text>{role(row.roleCode)}</Text></TableCell>
        <TableCell><ObjectStatus state={row.pending ? "None" : row.eligible ? "Positive" : "Negative"}>{t(row.pending === "DELETE" ? "organization.owners.pendingDelete" : row.pending === "ADD" ? "organization.owners.pendingAdd" : row.eligible ? "organization.owners.eligible" : "organization.owners.ineligible")}</ObjectStatus></TableCell>
        {editable ? <TableCell>{row.pending ? <Button design="Transparent" icon="undo" disabled={busy} onClick={() => onChange(changes.filter((change) => change.userId !== row.userId))}>{t("common.undo")}</Button> : null}</TableCell> : null}
      </TableRow>)}
    </Table>
    <Dialog open={open} accessibleName={t("organization.owners.select")} className="organizationOwnersDialog" onClose={close}
      footer={<DialogFooterBar>
        <Button design="Emphasized" disabled={busy || loading || Boolean(error) || !picked.size} onClick={add}>{t("common.add")}</Button>
        <Button design="Transparent" disabled={busy} onClick={close}>{t("common.cancel")}</Button>
      </DialogFooterBar>}>
      <ModalDialogHeader title={t("organization.owners.select")} onClose={close} />
      <FlexBox direction="Column" className="organizationOwnersPicker">
        <Bar endContent={<HeaderSearch value={search} onChange={setSearch} disabled={busy} accessibleName={t("organization.owners.search")} />} />
        <Text>{t("organization.owners.eligibilityHint")}</Text>
        {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
        <Table accessibleName={t("organization.owners.select")} noDataText={t("organization.owners.noOptions")} loading={loading} inert={busy || loading}
          features={<TableSelectionMulti selected={[...picked].join(" ")} onChange={(event) => { if (!busy) setPicked((current) => {
            const next = new Set(current);
            const selectedRows = event.target.getSelectedAsSet();
            for (const option of choices) { if (selectedRows.has(option.id)) next.add(option.id); else next.delete(option.id); }
            return next;
          }); }} />}
          headerRow={<TableHeaderRow><TableHeaderCell>{t("organization.owners.user")}</TableHeaderCell><TableHeaderCell>{t("organization.owners.username")}</TableHeaderCell><TableHeaderCell>{t("organization.owners.role")}</TableHeaderCell></TableHeaderRow>}>
          {choices.map((option) => <TableRow key={option.id} rowKey={option.id}><TableCell><Text>{option.displayLabel}</Text></TableCell><TableCell><Text>{option.username}</Text></TableCell><TableCell><Text>{role(option.roleCode)}</Text></TableCell></TableRow>)}
        </Table>
      </FlexBox>
    </Dialog>
  </FlexBox>;
}

import { DialogFooter } from "@/shared/components/DialogFooter";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button, Dialog, FlexBox, Input, MessageStrip, Table, TableCell, Text,
  TableHeaderCell, TableHeaderRow, TableRow, TextArea, Title,
} from "@ui5/webcomponents-react";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { MasterDataFormField } from "@/shared/components/MasterDataObjectHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import type { Objective, OrganizationObjective } from "../domain/objective.model";
import { objectiveApi } from "../infra/objective.api.repo";
import ObjectiveSelectionDialog from "./ObjectiveSelectionDialog";
import "../pages/objective.css";

type Form = { objectiveId: string; name: string; description: string; owner: string; validFrom: string; validTo: string };
const emptyForm: Form = { objectiveId: "", name: "", description: "", owner: "", validFrom: "", validTo: "" };

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export default function OrganizationObjectivesTab({ organizationId, manage, onDirtyChange }: {
  organizationId: string | null; manage: boolean; onDirtyChange?: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const [central, setCentral] = useState<Objective[]>([]);
  const [rows, setRows] = useState<OrganizationObjective[]>([]);
  const [editing, setEditing] = useState<OrganizationObjective | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [baseline, setBaseline] = useState("");
  const [removeCandidate, setRemoveCandidate] = useState<OrganizationObjective | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dateDrafts, setDateDrafts] = useState<Record<"validFrom" | "validTo", PersianDateDraftState>>({
    validFrom: { draftValue: "", valid: true, dirty: false },
    validTo: { draftValue: "", valid: true, dirty: false },
  });
  const invalidDateDraft = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const dirty = editing !== null && (JSON.stringify(form) !== baseline || invalidDateDraft);
  const available = useMemo(() => central.filter((item) =>
    item.kind === "OBJECTIVE" && item.status === "ACTIVE"
    && central.some((strategy) => strategy.id === item.parentObjectiveId && strategy.kind === "STRATEGY"
      && !strategy.parentObjectiveId)
    && !rows.some((row) => row.objectiveId === item.id)), [central, rows]);
  const selectableIds = useMemo(() => new Set(available.map((item) => item.id)), [available]);
  const chosenObjective = central.find((item) => item.id === form.objectiveId);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!organizationId) return;
    let live = true;
    void Promise.all([objectiveApi.list(), objectiveApi.listForOrganization(organizationId)])
      .then(([definitions, assignments]) => {
        if (live) { setCentral(definitions); setRows(assignments); setError(null); }
      })
      .catch((cause: unknown) => { if (live) setError(message(cause)); });
    return () => { live = false; };
  }, [organizationId]);

  const reload = async () => {
    if (!organizationId) return;
    setRows(await objectiveApi.listForOrganization(organizationId));
    setCentral(await objectiveApi.list());
  };

  const begin = (row: OrganizationObjective | "new") => {
    setPickerOpen(false);
    const next = row === "new" ? { ...emptyForm } : {
      objectiveId: row.objectiveId, name: row.name, description: row.description ?? "",
      owner: row.owner ?? "", validFrom: row.validFrom ?? "", validTo: row.validTo ?? "",
    };
    setForm(next);
    setBaseline(JSON.stringify(next));
    setDateDrafts({
      validFrom: { draftValue: "", valid: true, dirty: false },
      validTo: { draftValue: "", valid: true, dirty: false },
    });
    setEditing(row);
    setError(null);
  };

  const save = async () => {
    if (!organizationId || !form.objectiveId || !form.name.trim()
      || (editing === "new" && !selectableIds.has(form.objectiveId))) {
      setError(t("objective.organization.errors.required"));
      return;
    }
    if (invalidDateDraft || (form.validFrom && form.validTo && form.validFrom > form.validTo)) {
      setError(t("objective.errors.dates"));
      return;
    }
    setBusy(true);
    try {
      const fields = {
        name: form.name.trim(), description: form.description.trim() || null,
        owner: form.owner.trim() || null, validFrom: form.validFrom || null,
        validTo: form.validTo || null,
      };
      if (editing === "new") await objectiveApi.assign(organizationId, {
        objectiveId: form.objectiveId, ...fields,
      });
      else if (editing) await objectiveApi.updateAssignment(
        organizationId, editing.objectiveId, { ...fields, version: editing.version });
      await reload();
      setEditing(null);
      setError(null);
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!organizationId || !removeCandidate) return;
    setBusy(true);
    try {
      await objectiveApi.removeAssignment(organizationId, removeCandidate.objectiveId,
        removeCandidate.version);
      await reload();
      setRemoveCandidate(null);
      setError(null);
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  };

  const closeEditor = () => {
    setPickerOpen(false);
    if (dirty) setLeaveOpen(true);
    else setEditing(null);
  };

  if (!organizationId) return <MessageStrip design="Information" hideCloseButton>
    {t("objective.organization.saveFirst")}</MessageStrip>;

  return <div className="objectiveOrganizationTab">
    <div className="objectiveToolbar">
      <Title level="H5">{t("objective.organization.title")}</Title>
      <Button disabled={!manage || busy || available.length === 0} onClick={() => begin("new")}>
        {t("objective.organization.assign")}
      </Button>
    </div>
    {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}</MessageStrip> : null}
    <Table headerRow={<TableHeaderRow>
      <TableHeaderCell>{t("objective.code")}</TableHeaderCell>
      <TableHeaderCell>{t("objective.name")}</TableHeaderCell>
      <TableHeaderCell>{t("objective.owner")}</TableHeaderCell>
      <TableHeaderCell>{t("objective.actions")}</TableHeaderCell>
    </TableHeaderRow>}>
      {rows.map((row) => <TableRow key={row.id}>
        <TableCell>{row.objectiveCode}</TableCell>
        <TableCell>{row.name}</TableCell>
        <TableCell>{row.owner || "—"}</TableCell>
        <TableCell><div className="objectiveActions">
          <Button disabled={!manage || busy} onClick={() => begin(row)}>{t("common.edit")}</Button>
          <Button design="Negative" disabled={!manage || busy} onClick={() => setRemoveCandidate(row)}>
            {t("common.delete")}
          </Button>
        </div></TableCell>
      </TableRow>)}
    </Table>
    {rows.length === 0 ? <MessageStrip design="Information" hideCloseButton>
      {t("objective.organization.empty")}</MessageStrip> : null}
    <Dialog open={editing !== null} className="objectiveDialog" onClose={closeEditor}
      accessibleName={t(editing === "new" ? "objective.organization.assign" : "objective.organization.edit")}>
      <ModalDialogHeader title={t(editing === "new" ? "objective.organization.assign" : "objective.organization.edit")}
        onClose={closeEditor} />
      <div className="objectiveForm">
        <div className="modalTwoColumnGrid">
        <MasterDataFormField label={t("objective.organization.central")} required>
          {editing === "new" ? <FlexBox alignItems="Center" className="objectivePickerField">
            <Input readonly value={chosenObjective ? `${chosenObjective.code} · ${chosenObjective.name}` : ""}
              accessibleName={t("objective.organization.central")} />
            <Button icon="value-help" disabled={busy} tooltip={t("objective.selection.title")}
              accessibleName={t("objective.selection.title")} onClick={() => setPickerOpen(true)} />
          </FlexBox> : <Text>{chosenObjective ? `${chosenObjective.code} · ${chosenObjective.name}` : form.objectiveId}</Text>}
        </MasterDataFormField>
        <MasterDataFormField label={t("objective.name")} required>
        <Input value={form.name} disabled={busy}
          onInput={(event) => setForm((old) => ({ ...old, name: event.target.value }))} />
        </MasterDataFormField>
        <MasterDataFormField label={t("objective.owner")}>
        <Input value={form.owner} disabled={busy}
          onInput={(event) => setForm((old) => ({ ...old, owner: event.target.value }))} />
        </MasterDataFormField>
        <div className="modalDateRange">
        <MasterDataFormField label={t("objective.validFrom")}>
        <PersianDatePicker value={form.validFrom} disabled={busy} accessibleName={t("objective.validFrom")}
          invalidValueMessage={t("objective.errors.dates")}
          onChange={(value) => setForm((old) => ({ ...old, validFrom: value }))}
          onDraftStateChange={(state) => setDateDrafts((old) =>
            old.validFrom.valid === state.valid && old.validFrom.draftValue === state.draftValue
              && old.validFrom.dirty === state.dirty ? old : { ...old, validFrom: state })} />
        </MasterDataFormField>
        <MasterDataFormField label={t("objective.validTo")}>
        <PersianDatePicker value={form.validTo} disabled={busy} accessibleName={t("objective.validTo")}
          invalidValueMessage={t("objective.errors.dates")}
          onChange={(value) => setForm((old) => ({ ...old, validTo: value }))}
          onDraftStateChange={(state) => setDateDrafts((old) =>
            old.validTo.valid === state.valid && old.validTo.draftValue === state.draftValue
              && old.validTo.dirty === state.dirty ? old : { ...old, validTo: state })} />
        </MasterDataFormField>
        </div>
        <MasterDataFormField label={t("objective.description")} wide>
        <TextArea value={form.description} disabled={busy} rows={3}
          onInput={(event) => setForm((old) => ({ ...old, description: event.target.value }))} />
        </MasterDataFormField>
        </div>
        <DialogFooter>
          <Button design="Emphasized" disabled={busy || !dirty || invalidDateDraft} onClick={() => void save()}>
            {t("common.save")}</Button>
          <Button design="Transparent" onClick={closeEditor}>{t("common.cancel")}</Button>
        </DialogFooter>
      </div>
    </Dialog>
    <ObjectiveSelectionDialog open={pickerOpen && editing === "new"} items={central}
      selectedId={form.objectiveId || null} selectableIds={selectableIds} busy={busy}
      onClose={() => setPickerOpen(false)} onConfirm={(id) => {
        const objective = available.find((item) => item.id === id);
        if (!objective) return;
        setForm((old) => ({ ...old, objectiveId: id, name: objective.name }));
        setPickerOpen(false);
      }} />
    <DeleteConfirmDialog open={Boolean(removeCandidate)}
      title={t("objective.organization.remove")}
      message={t("objective.organization.removeConfirm", { name: removeCandidate?.name ?? "" })}
      confirmText={t("common.delete")} cancelText={t("common.cancel")} loading={busy}
      onClose={() => setRemoveCandidate(null)} onConfirm={() => void remove()} />
    <DeleteConfirmDialog open={leaveOpen}
      title={t("common.unsavedChanges.title")} message={t("common.unsavedChanges.message")}
      confirmText={t("common.unsavedChanges.leave")} cancelText={t("common.unsavedChanges.stay")}
      loading={false} onClose={() => setLeaveOpen(false)}
      onConfirm={() => { setLeaveOpen(false); setEditing(null); }} />
  </div>;
}

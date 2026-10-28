import { CatalogParentHeader } from "@/shared/components/CatalogParentHeader";
import { DialogFooter } from "@/shared/components/DialogFooter";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { Text, ObjectStatus, Input, Label, MessageStrip, Select, Option, TextArea } from "@ui5/webcomponents-react";

import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type {
  CentralControlEditableStatus,
  CentralControlGroupDetail,
  CentralControlGroupSummary,
  CreateCentralControlGroupCommand,
  UpdateCentralControlGroupCommand,
} from "../domain/centralControl.model";
import ControlGroupValueHelpDialog from "../components/ControlGroupValueHelpDialog";

export type ControlGroupObjectMode = "create" | "view" | "edit";

interface Props {
  mode: ControlGroupObjectMode;
  value: CentralControlGroupDetail | null;
  initialParentId: string | null;
  groups: CentralControlGroupSummary[];
  busy: boolean;
  error: string | null;
  onErrorClose: () => void;
  onSubmit: (payload: CreateCentralControlGroupCommand | UpdateCentralControlGroupCommand) => Promise<boolean>;
  onCancel: () => void;
  onEdit: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

const EMPTY_DATE_DRAFT: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };

export default function CentralControlGroupObjectPage({
  mode,
  value,
  initialParentId,
  groups,
  busy,
  error,
  onErrorClose,
  onSubmit,
  onCancel,
  onEdit,
  onDirtyChange,
}: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState(value?.code ?? "");
  const [title, setTitle] = useState(value?.title ?? "");
  const [description, setDescription] = useState(value?.description ?? "");
  const [parentGroupId, setParentGroupId] = useState<string | null>(value?.parentGroupId ?? initialParentId);
  const [status, setStatus] = useState<CentralControlEditableStatus>(mode !== "create" && value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
  const [validFrom, setValidFrom] = useState(value?.validFrom ?? "");
  const [validTo, setValidTo] = useState(value?.validTo ?? "");
  const [dateDrafts, setDateDrafts] = useState({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [valueHelpOpen, setValueHelpOpen] = useState(false);
  const readOnly = mode === "view";

  const normalized = useMemo(() => JSON.stringify({
    code: code.trim().toUpperCase(),
    title: title.trim(),
    description: description.trim(),
    parentGroupId,
    status,
    validFrom,
    validTo,
  }), [code, description, parentGroupId, status, title, validFrom, validTo]);
  const baseline = useMemo(() => JSON.stringify({
    code: value?.code ?? "",
    title: value?.title ?? "",
    description: value?.description ?? "",
    parentGroupId: value?.parentGroupId ?? initialParentId,
    status: mode !== "create" && value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    validFrom: value?.validFrom ?? "",
    validTo: value?.validTo ?? "",
  }), [initialParentId, mode, value]);
  const dirty = normalized !== baseline || dateDrafts.validFrom.dirty || dateDrafts.validTo.dirty || valueHelpOpen;
  const invalidDate = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const submit = async () => {
    if (!code.trim() || !title.trim()) {
      setValidationError(t("control.validation.groupRequired", { defaultValue: "شناسه و نام گروه کنترل الزامی است." }));
      return;
    }
    if (invalidDate || (validFrom && validTo && validFrom > validTo)) {
      setValidationError(t("control.validation.invalidValidityRange"));
      return;
    }
    setValidationError(null);
    const common = {
      title: title.trim(),
      parentGroupId,
      description: description.trim() || null,
      sortOrder: value?.sortOrder ?? 0,
      validFrom: validFrom || null,
      validTo: validTo || null,
    };
    const payload = mode === "create"
      ? { ...common, code: code.trim().toUpperCase() }
      : { ...common, status, version: value?.version ?? 0 };
    await onSubmit(payload);
  };

  const parent = groups.find((group) => group.id === parentGroupId);

  return (
    <div className="controlGroupObjectPage">
      <CatalogParentHeader objectTitle={title || t("control.nodeType.group")} label={t("control.fields.parentGroup")} parentId={parentGroupId}
        busy={busy} onClearParent={!readOnly ? () => setParentGroupId(null) : undefined}
        parent={parent ? { code: parent.code, title: parent.title, type: t("control.nodeType.group"), status: parent.status } : null}
        selection={!readOnly ? <Button design="Emphasized" disabled={busy} onClick={() => setValueHelpOpen(true)}>{t("catalog.parentHeader.select")}</Button> : null} />

      {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
      {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}
      <div className="controlFormGrid modalTwoColumnGrid">
        <div className="controlField"><Label showColon required>{t("control.fields.code")}</Label>{readOnly ? <Text className="objectPageValue">{(code) || "—"}</Text> : <Input value={code} readonly={mode !== "create"} disabled={busy} maxlength={64} onInput={(e) => setCode(e.target.value)} />}</div>
        <div className="controlField"><Label showColon required>{t("control.fields.name")}</Label>{readOnly ? <Text className="objectPageValue">{(title) || "—"}</Text> : <Input value={title} readonly={readOnly} disabled={busy} maxlength={255} onInput={(e) => setTitle(e.target.value)} />}</div>

        <div className="controlField"><Label showColon>{t("control.fields.status")}</Label>{mode === "create" ? <ObjectStatus state="Positive">{t("common.active")}</ObjectStatus> : readOnly ? <ObjectStatus state={status === "ACTIVE" ? "Positive" : "None"}>{t("control.status." + status)}</ObjectStatus> : <Select value={status} disabled={mode !== "edit" || busy} onChange={(e) => setStatus(e.target.value as CentralControlEditableStatus)}><Option value="ACTIVE">{t("control.status.ACTIVE")}</Option><Option value="INACTIVE">{t("control.status.INACTIVE")}</Option></Select>}</div>
        <div className="controlDateRangeRow">
          <div className="controlField"><Label showColon>{t("control.fields.validFrom")}</Label>{readOnly ? <Text className="objectPageValue">{(formatPersianDate(validFrom)) || "—"}</Text> : <PersianDatePicker value={validFrom} readonly={readOnly} disabled={busy} accessibleName={t("control.fields.validFrom")} invalidValueMessage={t("control.validation.invalidDate")} onChange={setValidFrom} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))} />}</div>
          <div className="controlField"><Label showColon>{t("control.fields.validTo")}</Label>{readOnly ? <Text className="objectPageValue">{(formatPersianDate(validTo)) || "—"}</Text> : <PersianDatePicker value={validTo} readonly={readOnly} disabled={busy} accessibleName={t("control.fields.validTo")} invalidValueMessage={t("control.validation.invalidDate")} onChange={setValidTo} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))} />}</div>
        </div>
        <div className="controlField controlFieldWide"><Label showColon>{t("control.fields.description")}</Label>{readOnly ? <Text className="objectPageValue">{(description) || "—"}</Text> : <TextArea rows={5} value={description} readonly={readOnly} disabled={busy} onInput={(e) => setDescription(e.target.value)} />}</div>
      </div>
      <DialogFooter>
        {mode === "view" ? (
          <><Button design="Emphasized" disabled={busy} onClick={onEdit}>{t("common.edit", { defaultValue: "ویرایش" })}</Button><Button design="Transparent" disabled={busy} onClick={onCancel}>{t("common.close", { defaultValue: "بستن" })}</Button></>
        ) : (
          <><Button design="Emphasized" disabled={busy || valueHelpOpen || invalidDate || !dirty} onClick={submit}>{t("control.actions.submit")}</Button><Button design="Transparent" disabled={busy} onClick={onCancel}>{t("common.cancel", { defaultValue: "انصراف" })}</Button></>
        )}
      </DialogFooter>
      <ControlGroupValueHelpDialog
        open={valueHelpOpen}
        groups={groups}
        currentGroupId={value?.id ?? null}
        selectedId={parentGroupId}
        busy={busy}
        onClose={() => setValueHelpOpen(false)}
        onSelect={(id) => { setParentGroupId(id); setValueHelpOpen(false); }}
      />
    </div>
  );
}

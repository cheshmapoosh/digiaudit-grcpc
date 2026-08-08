import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Input,
  Label,
  MessageStrip,
  Option,
  Select,
  Tab,
  TextArea,
  Title,
} from "@ui5/webcomponents-react";

import {
  DocumentManager,
  EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
  toDocumentAggregateRequest,
  type DocumentAggregateDraftError,
  type ParentSaveDocumentDraftState,
} from "@/features/document";
import type { CatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type {
  CentralControlAutomationType,
  CentralControlClass,
  CentralControlDetail,
  CentralControlEditableStatus,
  CentralControlImportance,
  CentralControlPurpose,
  CreateCentralControlCommand,
  UpdateCentralControlCommand,
} from "../domain/centralControl.model";

export type CentralControlObjectMode = "create" | "view" | "edit";
export type CentralControlTabKey =
  | "general"
  | "regulations"
  | "requirements"
  | "risks"
  | "accountGroups"
  | "documents";

interface FormState {
  code: string;
  title: string;
  description: string;
  controlClass: CentralControlClass | "";
  importance: CentralControlImportance | "";
  automationType: CentralControlAutomationType | "";
  controlPurpose: CentralControlPurpose | "";
  status: CentralControlEditableStatus;
  validFrom: string;
  validTo: string;
}

interface Props {
  mode: CentralControlObjectMode;
  value: CentralControlDetail | null;
  activeTab: CentralControlTabKey;
  busy: boolean;
  permissions: CatalogActionPermissions;
  error: string | null;
  documentError: DocumentAggregateDraftError | null;
  onErrorClose: () => void;
  onSubmit: (payload: CreateCentralControlCommand | UpdateCentralControlCommand) => Promise<boolean>;
  onCancel: () => void;
  onEdit: () => void;
  onActiveTabChange: (tab: CentralControlTabKey) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const EMPTY_DATE_DRAFT: PersianDateDraftState = {
  draftValue: "",
  valid: true,
  dirty: false,
};

const CONTROL_CLASSES: CentralControlClass[] = ["ACTIVITY_LEVEL", "ENTITY_LEVEL"];
const IMPORTANCE_VALUES: CentralControlImportance[] = ["PRIMARY", "SECONDARY"];
const AUTOMATION_TYPES: CentralControlAutomationType[] = ["MANUAL", "SYSTEM", "SEMI_AUTOMATED"];
const CONTROL_PURPOSES: CentralControlPurpose[] = ["PREVENTIVE", "DETECTIVE"];

function toForm(value: CentralControlDetail | null): FormState {
  return {
    code: value?.code ?? "",
    title: value?.title ?? "",
    description: value?.description ?? "",
    controlClass: value?.controlClass ?? "",
    importance: value?.importance ?? "",
    automationType: value?.automationType ?? "",
    controlPurpose: value?.controlPurpose ?? "",
    status: value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    validFrom: value?.validFrom ?? "",
    validTo: value?.validTo ?? "",
  };
}

function normalized(form: FormState) {
  return {
    code: form.code.trim().toUpperCase(),
    title: form.title.trim(),
    description: form.description.trim(),
    controlClass: form.controlClass,
    importance: form.importance,
    automationType: form.automationType,
    controlPurpose: form.controlPurpose,
    status: form.status,
    validFrom: form.validFrom.trim(),
    validTo: form.validTo.trim(),
  };
}

function readValue(event: unknown): string {
  return (event as { target?: { value?: string } }).target?.value ?? "";
}

function Field({ label, required, fullWidth, children }: { label: string; required?: boolean; fullWidth?: boolean; children: ReactNode }) {
  return (
    <div className={fullWidth ? "controlField controlFieldWide" : "controlField"}>
      <Label showColon required={required}>{label}</Label>
      {children}
    </div>
  );
}

export default function CentralControlObjectPage({
  mode,
  value,
  activeTab,
  busy,
  permissions,
  error,
  documentError,
  onErrorClose,
  onSubmit,
  onCancel,
  onEdit,
  onActiveTabChange,
  onDirtyChange,
}: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(() => toForm(value));
  const [baseline, setBaseline] = useState(() => JSON.stringify(normalized(toForm(value))));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
  const [dateDrafts, setDateDrafts] = useState({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
  const scopeRef = useRef(mode === "create" ? "CREATE" : value?.id ?? "EMPTY");

  const readOnly = mode === "view";
  const invalidDate = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const generalDirty = JSON.stringify(normalized(form)) !== baseline || dateDrafts.validFrom.dirty || dateDrafts.validTo.dirty;
  const dirty = generalDirty || documents.dirty || documents.uploading;
  const scope = mode === "create" ? "CREATE" : value?.id ?? "EMPTY";

  useEffect(() => {
    if (scopeRef.current === scope && dirty) return;
    const next = toForm(value);
    const timer = window.setTimeout(() => {
      setForm(next);
      setBaseline(JSON.stringify(normalized(next)));
      setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
      setDateDrafts({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
      scopeRef.current = scope;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dirty, scope, value]);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const change = <K extends keyof FormState>(key: K, next: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: next }));

  const validate = () => {
    if (!form.code.trim()) {
      setValidationError(t("control.validation.codeRequired"));
      return false;
    }
    if (!form.title.trim()) {
      setValidationError(t("control.validation.nameRequired"));
      return false;
    }
    if (invalidDate) {
      setValidationError(t("control.validation.invalidDate"));
      return false;
    }
    if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
      setValidationError(t("control.validation.invalidValidityRange"));
      return false;
    }
    if (!documents.ready || documents.invalid || documents.uploading) {
      setValidationError(t("control.validation.documentsNotReady"));
      onActiveTabChange("documents");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const submit = async () => {
    if (readOnly || !validate()) return;
    const common = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      controlClass: form.controlClass || null,
      importance: form.importance || null,
      automationType: form.automationType || null,
      controlPurpose: form.controlPurpose || null,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      documents: toDocumentAggregateRequest(documents),
    };
    const payload: CreateCentralControlCommand | UpdateCentralControlCommand =
      mode === "create"
        ? { ...common, code: form.code.trim().toUpperCase() }
        : { ...common, status: form.status, version: value?.version ?? 0 };
    if (await onSubmit(payload)) {
      setBaseline(JSON.stringify(normalized(form)));
      onDirtyChange(false);
    }
  };

  const saveDisabled =
    busy || invalidDate || documents.uploading || documents.invalid || !documents.ready || (!generalDirty && !documents.dirty);

  const headerValues = useMemo(
    () => [
      [t("control.fields.code"), form.code || "-"],
      [t("control.fields.createdAt"), formatPersianDateTime(value?.createdAt)],
      [t("control.fields.validTo"), formatPersianDate(form.validTo)],
      [t("control.fields.status"), t(`control.status.${form.status}`)],
    ],
    [form.code, form.status, form.validTo, t, value?.createdAt],
  );

  return (
    <div className="controlObjectPage">
      <div className="controlObjectHeader">
        <Title level="H4">{form.title || t("control.object.title")}</Title>
        <div className="controlHeaderGrid">
          {headerValues.map(([label, displayValue]) => (
            <div className="controlHeaderItem" key={label}>
              <Label showColon>{label}</Label>
              <Input value={displayValue} readonly />
            </div>
          ))}
        </div>
      </div>

      <DetailTabContainer
        onTabSelect={(event) => {
          const key = event.detail.tab.getAttribute("data-tab-key") as CentralControlTabKey | null;
          if (key === "general" || key === "documents") onActiveTabChange(key);
        }}
      >
        <Tab text={t("control.tabs.general")} selected={activeTab === "general"} data-tab-key="general" />
        <Tab text={t("control.tabs.regulations")} disabled data-tab-key="regulations" />
        <Tab text={t("control.tabs.requirements")} disabled data-tab-key="requirements" />
        <Tab text={t("control.tabs.risks")} disabled data-tab-key="risks" />
        <Tab text={t("control.tabs.accountGroups")} disabled data-tab-key="accountGroups" />
        <Tab text={t("control.tabs.documents")} selected={activeTab === "documents"} data-tab-key="documents" />
      </DetailTabContainer>

      {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
      {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}

      <div className="controlObjectBody">
        <div className={activeTab === "general" ? "controlTabPanel" : "controlTabPanel controlTabPanelHidden"}>
          <div className="controlFormGrid">
            <Field label={t("control.fields.code")} required>
              <Input value={form.code} readonly={mode !== "create"} disabled={busy} maxlength={64} onInput={(event) => change("code", readValue(event))} />
            </Field>
            <Field label={t("control.fields.name")} required>
              <Input value={form.title} readonly={readOnly} disabled={busy} maxlength={255} onInput={(event) => change("title", readValue(event))} />
            </Field>
            <Field label={t("control.fields.controlClass")}>
              <Select value={form.controlClass} disabled={readOnly || busy} onChange={(event) => change("controlClass", readValue(event) as FormState["controlClass"])}>
                <Option value="">{t("common.notSpecified", { defaultValue: "تعیین نشده" })}</Option>
                {CONTROL_CLASSES.map((item) => <Option key={item} value={item}>{t(`control.controlClass.${item}`)}</Option>)}
              </Select>
            </Field>
            <Field label={t("control.fields.importance")}>
              <Select value={form.importance} disabled={readOnly || busy} onChange={(event) => change("importance", readValue(event) as FormState["importance"])}>
                <Option value="">{t("common.notSpecified", { defaultValue: "تعیین نشده" })}</Option>
                {IMPORTANCE_VALUES.map((item) => <Option key={item} value={item}>{t(`control.importance.${item}`)}</Option>)}
              </Select>
            </Field>
            <Field label={t("control.fields.automationType")}>
              <Select value={form.automationType} disabled={readOnly || busy} onChange={(event) => change("automationType", readValue(event) as FormState["automationType"])}>
                <Option value="">{t("common.notSpecified", { defaultValue: "تعیین نشده" })}</Option>
                {AUTOMATION_TYPES.map((item) => <Option key={item} value={item}>{t(`control.automationType.${item}`)}</Option>)}
              </Select>
            </Field>
            <Field label={t("control.fields.controlPurpose")}>
              <Select value={form.controlPurpose} disabled={readOnly || busy} onChange={(event) => change("controlPurpose", readValue(event) as FormState["controlPurpose"])}>
                <Option value="">{t("common.notSpecified", { defaultValue: "تعیین نشده" })}</Option>
                {CONTROL_PURPOSES.map((item) => <Option key={item} value={item}>{t(`control.controlPurpose.${item}`)}</Option>)}
              </Select>
            </Field>
            <Field label={t("control.fields.status")}>
              <Select
                value={form.status}
                disabled={mode !== "edit" || busy}
                accessibleName={t("control.fields.status")}
                onChange={(event) => change("status", readValue(event) as CentralControlEditableStatus)}
              >
                <Option value="ACTIVE">{t("control.status.ACTIVE")}</Option>
                <Option value="INACTIVE">{t("control.status.INACTIVE")}</Option>
              </Select>
            </Field>
            <Field label={t("control.fields.validFrom")}>
              <PersianDatePicker
                value={form.validFrom}
                readonly={readOnly}
                disabled={busy}
                accessibleName={t("control.fields.validFrom")}
                invalidValueMessage={t("control.validation.invalidDate")}
                onChange={(next) => change("validFrom", next)}
                onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))}
              />
            </Field>
            <Field label={t("control.fields.validTo")}>
              <PersianDatePicker
                value={form.validTo}
                readonly={readOnly}
                disabled={busy}
                accessibleName={t("control.fields.validTo")}
                invalidValueMessage={t("control.validation.invalidDate")}
                onChange={(next) => change("validTo", next)}
                onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))}
              />
            </Field>
            <Field label={t("control.fields.description")} fullWidth>
              <TextArea rows={5} value={form.description} readonly={readOnly} disabled={busy} onInput={(event) => change("description", readValue(event))} />
            </Field>
          </div>
        </div>

        <div className={activeTab === "documents" ? "controlTabPanel" : "controlTabPanel controlTabPanelHidden"}>
          <DocumentManager
            targetType="CENTRAL_CONTROL"
            targetId={value?.id ?? null}
            readOnly={readOnly || !permissions.documentUpload}
            showActions={!readOnly && permissions.documentUpload}
            busy={busy}
            persistenceMode="PARENT_SAVE"
            aggregateError={documentError}
            onDraftStateChange={setDocuments}
            title={t("control.tabs.documents")}
          />
        </div>
      </div>

      <div className="controlObjectFooter">
        {mode === "view" ? (
          <>
            <Button design="Emphasized" disabled={busy || !permissions.update} onClick={onEdit}>
              {t("common.edit", { defaultValue: "ویرایش" })}
            </Button>
            <Button design="Transparent" disabled={busy} onClick={onCancel}>
              {t("common.close", { defaultValue: "بستن" })}
            </Button>
          </>
        ) : (
          <>
            <Button design="Emphasized" disabled={saveDisabled} onClick={() => void submit()}>
              {t("control.actions.submit", { defaultValue: "ثبت" })}
            </Button>
            <Button design="Transparent" disabled={busy} onClick={onCancel}>
              {t("common.cancel", { defaultValue: "انصراف" })}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

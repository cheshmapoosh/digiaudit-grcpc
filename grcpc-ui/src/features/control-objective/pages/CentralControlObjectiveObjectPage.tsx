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
  CentralControlObjectiveDetail,
  CentralControlObjectiveEditableStatus,
  CreateCentralControlObjectiveCommand,
  UpdateCentralControlObjectiveCommand,
} from "../domain/centralControlObjective.model";

export type CentralControlObjectiveObjectMode = "create" | "view" | "edit";
export type CentralControlObjectiveTabKey = "general" | "subprocesses" | "risks" | "documents";

interface FormState {
  code: string;
  title: string;
  description: string;
  objectiveClass: string;
  status: CentralControlObjectiveEditableStatus;
  validFrom: string;
  validTo: string;
}

interface Props {
  mode: CentralControlObjectiveObjectMode;
  value: CentralControlObjectiveDetail | null;
  activeTab: CentralControlObjectiveTabKey;
  busy: boolean;
  permissions: CatalogActionPermissions;
  error: string | null;
  documentError: DocumentAggregateDraftError | null;
  onErrorClose: () => void;
  onSubmit: (payload: CreateCentralControlObjectiveCommand | UpdateCentralControlObjectiveCommand) => Promise<boolean>;
  onCancel: () => void;
  onEdit: () => void;
  onActiveTabChange: (tab: CentralControlObjectiveTabKey) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const EMPTY_DATE_DRAFT: PersianDateDraftState = {
  draftValue: "",
  valid: true,
  dirty: false,
};

function toForm(value: CentralControlObjectiveDetail | null): FormState {
  return {
    code: value?.code ?? "",
    title: value?.title ?? "",
    description: value?.description ?? "",
    objectiveClass: value?.objectiveClass ?? "",
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
    objectiveClass: form.objectiveClass.trim(),
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
    <div className={fullWidth ? "controlObjectiveField controlObjectiveFieldWide" : "controlObjectiveField"}>
      <Label showColon required={required}>{label}</Label>
      {children}
    </div>
  );
}

export default function CentralControlObjectiveObjectPage({
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
      setValidationError(t("controlObjective.validation.codeRequired"));
      return false;
    }
    if (!form.title.trim()) {
      setValidationError(t("controlObjective.validation.nameRequired"));
      return false;
    }
    if (form.objectiveClass.trim().length > 255) {
      setValidationError(t("controlObjective.validation.objectiveClassTooLong"));
      return false;
    }
    if (invalidDate) {
      setValidationError(t("controlObjective.validation.invalidDate"));
      return false;
    }
    if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
      setValidationError(t("controlObjective.validation.invalidValidityRange"));
      return false;
    }
    if (!documents.ready || documents.invalid || documents.uploading) {
      setValidationError(t("controlObjective.validation.documentsNotReady"));
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
      objectiveClass: form.objectiveClass.trim() || null,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      documents: toDocumentAggregateRequest(documents),
    };
    const payload: CreateCentralControlObjectiveCommand | UpdateCentralControlObjectiveCommand =
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
      [t("controlObjective.fields.code"), form.code || "-"],
      [t("controlObjective.fields.createdAt"), formatPersianDateTime(value?.createdAt)],
      [t("controlObjective.fields.validTo"), formatPersianDate(form.validTo)],
      [t("controlObjective.fields.status"), t(`controlObjective.status.${form.status}`)],
    ],
    [form.code, form.status, form.validTo, t, value?.createdAt],
  );

  return (
    <div className="controlObjectiveObjectPage">
      <div className="controlObjectiveObjectHeader">
        <Title level="H4">{form.title || t("controlObjective.object.title")}</Title>
        <div className="controlObjectiveHeaderGrid">
          {headerValues.map(([label, displayValue]) => (
            <div className="controlObjectiveHeaderItem" key={label}>
              <Label showColon>{label}</Label>
              <Input value={displayValue} readonly />
            </div>
          ))}
        </div>
      </div>

      <DetailTabContainer
        onTabSelect={(event) => {
          const key = event.detail.tab.getAttribute("data-tab-key") as CentralControlObjectiveTabKey | null;
          if (key === "general" || key === "documents") onActiveTabChange(key);
        }}
      >
        <Tab text={t("controlObjective.tabs.general")} selected={activeTab === "general"} data-tab-key="general" />
        <Tab text={t("controlObjective.tabs.subprocesses")} disabled data-tab-key="subprocesses" />
        <Tab text={t("controlObjective.tabs.risks")} disabled data-tab-key="risks" />
        <Tab text={t("controlObjective.tabs.documents")} selected={activeTab === "documents"} data-tab-key="documents" />
      </DetailTabContainer>

      {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
      {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}

      <div className="controlObjectiveObjectBody">
        <div className={activeTab === "general" ? "controlObjectiveTabPanel" : "controlObjectiveTabPanel controlObjectiveTabPanelHidden"}>
          <div className="controlObjectiveFormGrid">
            <Field label={t("controlObjective.fields.code")} required>
              <Input value={form.code} readonly={mode !== "create"} disabled={busy} maxlength={64} onInput={(event) => change("code", readValue(event))} />
            </Field>
            <Field label={t("controlObjective.fields.name")} required>
              <Input value={form.title} readonly={readOnly} disabled={busy} maxlength={255} onInput={(event) => change("title", readValue(event))} />
            </Field>
            <Field label={t("controlObjective.fields.objectiveClass")}>
              <Input value={form.objectiveClass} readonly={readOnly} disabled={busy} maxlength={255} onInput={(event) => change("objectiveClass", readValue(event))} />
            </Field>
            <Field label={t("controlObjective.fields.status")}>
              <Select
                value={form.status}
                disabled={mode !== "edit" || busy}
                accessibleName={t("controlObjective.fields.status")}
                onChange={(event) => change("status", readValue(event) as CentralControlObjectiveEditableStatus)}
              >
                <Option value="ACTIVE">{t("controlObjective.status.ACTIVE")}</Option>
                <Option value="INACTIVE">{t("controlObjective.status.INACTIVE")}</Option>
              </Select>
            </Field>
            <Field label={t("controlObjective.fields.validFrom")}>
              <PersianDatePicker
                value={form.validFrom}
                readonly={readOnly}
                disabled={busy}
                accessibleName={t("controlObjective.fields.validFrom")}
                invalidValueMessage={t("controlObjective.validation.invalidDate")}
                onChange={(next) => change("validFrom", next)}
                onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))}
              />
            </Field>
            <Field label={t("controlObjective.fields.validTo")}>
              <PersianDatePicker
                value={form.validTo}
                readonly={readOnly}
                disabled={busy}
                accessibleName={t("controlObjective.fields.validTo")}
                invalidValueMessage={t("controlObjective.validation.invalidDate")}
                onChange={(next) => change("validTo", next)}
                onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))}
              />
            </Field>
            <Field label={t("controlObjective.fields.description")} fullWidth>
              <TextArea rows={5} value={form.description} readonly={readOnly} disabled={busy} onInput={(event) => change("description", readValue(event))} />
            </Field>
          </div>
        </div>

        <div className={activeTab === "documents" ? "controlObjectiveTabPanel" : "controlObjectiveTabPanel controlObjectiveTabPanelHidden"}>
          <DocumentManager
            targetType="CENTRAL_CONTROL_OBJECTIVE_DEF"
            targetId={value?.id ?? null}
            readOnly={readOnly || !permissions.documentUpload}
            showActions={!readOnly && permissions.documentUpload}
            busy={busy}
            persistenceMode="PARENT_SAVE"
            aggregateError={documentError}
            onDraftStateChange={setDocuments}
            title={t("controlObjective.tabs.documents")}
          />
        </div>
      </div>

      <div className="controlObjectiveObjectFooter">
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
              {t("controlObjective.actions.submit", { defaultValue: "ثبت" })}
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

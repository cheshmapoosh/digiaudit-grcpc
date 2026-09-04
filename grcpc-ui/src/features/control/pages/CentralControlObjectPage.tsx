import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Input,
  Label,
  MessageStrip,
  MultiComboBox,
  MultiComboBoxItem,
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
import ControlSubprocessScopesTab from "@/features/control-scope/components/ControlSubprocessScopesTab";
import { useControlScopePermissions } from "@/features/control-scope/security/controlScopePermissions";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import ControlGroupValueHelpDialog from "../components/ControlGroupValueHelpDialog";
import type {
  CentralControlAutomationType,
  CentralControlClass,
  CentralControlDetail,
  CentralControlEditableStatus,
  CentralControlEvidenceLevel,
  CentralControlGroupSummary,
  CentralControlImportance,
  CentralControlNature,
  CentralControlOperationFrequency,
  CentralControlPurpose,
  CentralControlRelevance,
  CentralControlRisk,
  CentralControlTestAutomationType,
  CentralControlTestingTechnique,
  CentralControlTriggerType,
  CreateCentralControlCommand,
  UpdateCentralControlCommand,
} from "../domain/centralControl.model";

export type CentralControlObjectMode = "create" | "view" | "edit";
export type CentralControlTabKey =
  | "general"
  | "subprocesses"
  | "regulations"
  | "requirements"
  | "risks"
  | "accountGroups"
  | "documents";

interface FormState {
  code: string;
  title: string;
  description: string;
  controlGroupId: string | null;
  controlClass: CentralControlClass | "";
  importance: CentralControlImportance | "";
  controlRisk: CentralControlRisk | "";
  automationType: CentralControlAutomationType | "";
  controlPurpose: CentralControlPurpose | "";
  nature: CentralControlNature | "";
  controlRelevance: CentralControlRelevance[];
  triggerType: CentralControlTriggerType | "";
  eventDescription: string;
  operationFrequency: CentralControlOperationFrequency | "";
  toBeTested: "" | "true" | "false";
  testAutomationType: CentralControlTestAutomationType | "";
  testingTechnique: CentralControlTestingTechnique | "";
  evidenceLevel: CentralControlEvidenceLevel | "";
  status: CentralControlEditableStatus;
  validFrom: string;
  validTo: string;
}

interface Props {
  mode: CentralControlObjectMode;
  value: CentralControlDetail | null;
  initialControlGroupId?: string | null;
  groups: CentralControlGroupSummary[];
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

const EMPTY_DATE_DRAFT: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };
const CONTROL_CLASSES: CentralControlClass[] = ["ACTIVITY_LEVEL", "ENTITY_LEVEL"];
const IMPORTANCE_VALUES: CentralControlImportance[] = ["PRIMARY", "SECONDARY"];
const CONTROL_RISKS: CentralControlRisk[] = ["LOW", "MEDIUM", "HIGH"];
const AUTOMATION_TYPES: CentralControlAutomationType[] = ["MANUAL", "SYSTEM", "SEMI_AUTOMATED"];
const PURPOSES: CentralControlPurpose[] = ["PREVENTIVE", "DETECTIVE"];
const NATURES: CentralControlNature[] = ["ADJUSTMENT", "AUTHORIZATION", "INITIATION", "MATCH", "PROCESSING", "RECONCILIATION", "RECORDING", "RESTRICTED_ACCESS", "REVIEW", "SAFEGUARDING_OF_ASSETS", "SEGREGATION_OF_DUTIES"];
const RELEVANCE_VALUES: CentralControlRelevance[] = ["CONTROL_ACTIVITIES", "CONTROL_ENVIRONMENT", "INFORMATION_AND_COMMUNICATION", "MONITORING", "FRAUD_PREVENTION_AND_DETECTION", "RISK_ASSESSMENT"];
const TRIGGERS: CentralControlTriggerType[] = ["EVENT", "DATE"];
const FREQUENCIES: CentralControlOperationFrequency[] = ["ANNUAL", "BI_WEEKLY", "CONTINUAL", "DAILY", "MONTHLY", "QUARTERLY", "SEMI_MONTHLY", "WEEKLY"];
const TEST_AUTOMATION: CentralControlTestAutomationType[] = ["AUTOMATED", "MANUAL", "SEMI_AUTOMATED"];
const TESTING_TECHNIQUES: CentralControlTestingTechnique[] = ["ATTRIBUTE_SAMPLING", "DOCUMENT_INSPECTION_WITH_INQUIRY", "CONTROL_OBSERVATION_WITH_INQUIRY", "CONTROL_REPERFORMANCE_WITH_INQUIRY"];
const EVIDENCE_LEVELS: CentralControlEvidenceLevel[] = ["NO_TESTING", "SELF_ASSESSMENT", "CONTROL_DESIGN_AND_EFFECTIVENESS", "NOT_APPLICABLE"];

function toForm(value: CentralControlDetail | null, initialControlGroupId?: string | null): FormState {
  return {
    code: value?.code ?? "",
    title: value?.title ?? "",
    description: value?.description ?? "",
    controlGroupId: value?.controlGroupId ?? initialControlGroupId ?? null,
    controlClass: value?.controlClass ?? "",
    importance: value?.importance ?? "",
    controlRisk: value?.controlRisk ?? "",
    automationType: value?.automationType ?? "",
    controlPurpose: value?.controlPurpose ?? "",
    nature: value?.nature ?? "",
    controlRelevance: value?.controlRelevance ?? [],
    triggerType: value?.triggerType ?? "",
    eventDescription: value?.eventDescription ?? "",
    operationFrequency: value?.operationFrequency ?? "",
    toBeTested: value?.toBeTested == null ? "" : value.toBeTested ? "true" : "false",
    testAutomationType: value?.testAutomationType ?? "",
    testingTechnique: value?.testingTechnique ?? "",
    evidenceLevel: value?.evidenceLevel ?? "",
    status: value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    validFrom: value?.validFrom ?? "",
    validTo: value?.validTo ?? "",
  };
}

function normalized(form: FormState) {
  return {
    ...form,
    code: form.code.trim().toUpperCase(),
    title: form.title.trim(),
    description: form.description.trim(),
    controlRelevance: [...form.controlRelevance].sort(),
    eventDescription: form.triggerType === "EVENT" ? form.eventDescription.trim() : "",
    operationFrequency: form.triggerType === "DATE" ? form.operationFrequency : "",
  };
}

function readValue(event: unknown): string {
  return (event as { target?: { value?: string } }).target?.value ?? "";
}

function Field({ label, required, fullWidth, children }: { label: string; required?: boolean; fullWidth?: boolean; children: ReactNode }) {
  return <div className={fullWidth ? "controlField controlFieldWide" : "controlField"}><Label showColon required={required}>{label}</Label>{children}</div>;
}

export default function CentralControlObjectPage({
  mode,
  value,
  initialControlGroupId,
  groups,
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
  const controlScopePermissions = useControlScopePermissions();
  const [form, setForm] = useState<FormState>(() => toForm(value, initialControlGroupId));
  const [baseline, setBaseline] = useState(() => JSON.stringify(normalized(toForm(value, initialControlGroupId))));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
  const [dateDrafts, setDateDrafts] = useState({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
  const [groupHelpOpen, setGroupHelpOpen] = useState(false);
  const scopeRef = useRef(mode === "create" ? "CREATE" : value?.id ?? "EMPTY");
  const readOnly = mode === "view";
  const invalidDate = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const generalDirty = JSON.stringify(normalized(form)) !== baseline || dateDrafts.validFrom.dirty || dateDrafts.validTo.dirty;
  const dirty = generalDirty || documents.dirty || documents.uploading;
  const scope = mode === "create" ? "CREATE" : value?.id ?? "EMPTY";
  const allRelevanceSelected = form.controlRelevance.length === RELEVANCE_VALUES.length;

  useEffect(() => {
    if (scopeRef.current === scope && dirty) return;
    const next = toForm(value, initialControlGroupId);
    const timer = window.setTimeout(() => {
      setForm(next);
      setBaseline(JSON.stringify(normalized(next)));
      setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
      setDateDrafts({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
      scopeRef.current = scope;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dirty, initialControlGroupId, scope, value]);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const change = <K extends keyof FormState>(key: K, next: FormState[K]) => setForm((current) => ({ ...current, [key]: next }));
  const groupTitle = groups.find((group) => group.id === form.controlGroupId)?.title ?? t("common.notSpecified", { defaultValue: "تعیین نشده" });

  const changeTrigger = (next: FormState["triggerType"]) => {
    setForm((current) => ({
      ...current,
      triggerType: next,
      eventDescription: next === "EVENT" ? current.eventDescription : "",
      operationFrequency: next === "DATE" ? current.operationFrequency : "",
    }));
  };

  const validate = () => {
    if (!form.code.trim()) { setValidationError(t("control.validation.codeRequired")); return false; }
    if (!form.title.trim()) { setValidationError(t("control.validation.nameRequired")); return false; }
    if (invalidDate) { setValidationError(t("control.validation.invalidDate")); return false; }
    if (form.validFrom && form.validTo && form.validFrom > form.validTo) { setValidationError(t("control.validation.invalidValidityRange")); return false; }
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
      controlGroupId: form.controlGroupId,
      controlClass: form.controlClass || null,
      importance: form.importance || null,
      controlRisk: form.controlRisk || null,
      automationType: form.automationType || null,
      controlPurpose: form.controlPurpose || null,
      nature: form.nature || null,
      controlRelevance: form.controlRelevance,
      triggerType: form.triggerType || null,
      eventDescription: form.triggerType === "EVENT" ? (form.eventDescription.trim() || null) : null,
      operationFrequency: form.triggerType === "DATE" ? (form.operationFrequency || null) : null,
      toBeTested: form.toBeTested === "" ? null : form.toBeTested === "true",
      testAutomationType: form.testAutomationType || null,
      testingTechnique: form.testingTechnique || null,
      evidenceLevel: form.evidenceLevel || null,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      documents: toDocumentAggregateRequest(documents),
    };
    const payload: CreateCentralControlCommand | UpdateCentralControlCommand = mode === "create"
      ? { ...common, code: form.code.trim().toUpperCase() }
      : { ...common, status: form.status, version: value?.version ?? 0 };
    if (await onSubmit(payload)) {
      setBaseline(JSON.stringify(normalized(form)));
      onDirtyChange(false);
    }
  };

  const saveDisabled = busy || invalidDate || documents.uploading || documents.invalid || !documents.ready || (!generalDirty && !documents.dirty);
  const headerValues = useMemo(() => [
    [t("control.fields.code"), form.code || "-"],
    [t("control.fields.createdAt"), formatPersianDateTime(value?.createdAt)],
    [t("control.fields.validFrom"), formatPersianDate(form.validFrom)],
    [t("control.fields.validTo"), formatPersianDate(form.validTo)],
  ], [form.code, form.validFrom, form.validTo, t, value?.createdAt]);

  const selectField = <T extends string>(label: string, selectedValue: T | "", values: readonly T[], key: keyof FormState, prefix: string) => (
    <Field label={label}><Select value={selectedValue} disabled={readOnly || busy} onChange={(event) => change(key, readValue(event) as never)}><Option value="">{t("common.notSpecified", { defaultValue: "تعیین نشده" })}</Option>{values.map((item) => <Option key={item} value={item}>{t(`${prefix}.${item}`)}</Option>)}</Select></Field>
  );

  return (
    <div className="controlObjectPage">
      <div className="controlObjectHeader">
        <Title level="H4">{form.title || t("control.object.title")}</Title>
        <div className="controlHeaderGrid">{headerValues.map(([label, displayValue]) => <div className="controlHeaderItem" key={label}><Label showColon>{label}</Label><Input value={displayValue} readonly /></div>)}</div>
      </div>

      <DetailTabContainer onTabSelect={(event) => {
        const key = event.detail.tab.getAttribute("data-tab-key") as CentralControlTabKey | null;
        if (key === "general" || key === "documents" || (key === "subprocesses" && value?.id && controlScopePermissions.view)) onActiveTabChange(key);
      }}>
        <Tab text={t("control.tabs.general")} selected={activeTab === "general"} data-tab-key="general" />
        <Tab text={t("control.tabs.subprocesses")} selected={activeTab === "subprocesses"} disabled={!value?.id || !controlScopePermissions.view} data-tab-key="subprocesses" />
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
            <Field label={t("control.fields.code")} required><Input value={form.code} readonly={mode !== "create"} disabled={busy} maxlength={64} onInput={(e) => change("code", e.target.value)} /></Field>
            <Field label={t("control.fields.name")} required><Input value={form.title} readonly={readOnly} disabled={busy} maxlength={255} onInput={(e) => change("title", e.target.value)} /></Field>
            <Field label={t("control.fields.controlGroup")}><div style={{ display: "flex", gap: "0.5rem" }}><Input value={groupTitle} readonly style={{ flex: 1 }} /><Button disabled={readOnly || busy} onClick={() => setGroupHelpOpen(true)}>{t("common.select", { defaultValue: "انتخاب" })}</Button></div></Field>
            {selectField(t("control.fields.controlClass"), form.controlClass, CONTROL_CLASSES, "controlClass", "control.controlClass")}
            {selectField(t("control.fields.importance"), form.importance, IMPORTANCE_VALUES, "importance", "control.importance")}
            {selectField(t("control.fields.controlRisk"), form.controlRisk, CONTROL_RISKS, "controlRisk", "control.controlRisk")}
            {selectField(t("control.fields.automationType"), form.automationType, AUTOMATION_TYPES, "automationType", "control.automationType")}
            {selectField(t("control.fields.controlPurpose"), form.controlPurpose, PURPOSES, "controlPurpose", "control.controlPurpose")}
            {selectField(t("control.fields.nature"), form.nature, NATURES, "nature", "control.nature")}
            <Field label={t("control.fields.controlRelevance")} fullWidth>
              <div className="controlRelevanceField">
                <div className="controlRelevanceActions">
                  <Button
                    design="Transparent"
                    disabled={readOnly || busy}
                    onClick={() => change("controlRelevance", allRelevanceSelected ? [] : [...RELEVANCE_VALUES])}
                  >
                    {t(allRelevanceSelected ? "control.actions.clearSelection" : "control.actions.selectAll")}
                  </Button>
                </div>
                <MultiComboBox
                  className="controlRelevanceMultiCombo"
                  disabled={readOnly || busy}
                  onSelectionChange={(event) => {
                    const selected = (event.detail.items ?? [])
                      .map((item) => item.getAttribute("data-value") as CentralControlRelevance)
                      .filter(Boolean);
                    change("controlRelevance", selected);
                  }}
                >
                  {RELEVANCE_VALUES.map((item) => <MultiComboBoxItem key={item} data-value={item} text={t(`control.controlRelevance.${item}`)} selected={form.controlRelevance.includes(item)} />)}
                </MultiComboBox>
              </div>
            </Field>
            <Field label={t("control.fields.triggerType")}>
              <Select value={form.triggerType} disabled={readOnly || busy} onChange={(event) => changeTrigger(readValue(event) as FormState["triggerType"])}>
                <Option value="">{t("common.notSpecified", { defaultValue: "تعیین نشده" })}</Option>
                {TRIGGERS.map((item) => <Option key={item} value={item}>{t(`control.triggerType.${item}`)}</Option>)}
              </Select>
            </Field>
            <Field label={t("control.fields.operationFrequency")}><Select value={form.operationFrequency} disabled={readOnly || busy || form.triggerType !== "DATE"} onChange={(e) => change("operationFrequency", e.target.value as FormState["operationFrequency"])}><Option value="">{t("common.notSpecified", { defaultValue: "تعیین نشده" })}</Option>{FREQUENCIES.map((item) => <Option key={item} value={item}>{t(`control.operationFrequency.${item}`)}</Option>)}</Select></Field>
            <Field label={t("control.fields.eventDescription")} fullWidth>
              <TextArea
                rows={3}
                value={form.eventDescription}
                readonly={readOnly}
                disabled={busy || form.triggerType !== "EVENT"}
                maxlength={1000}
                onInput={(event) => change("eventDescription", event.target.value)}
              />
            </Field>
            <Field label={t("control.fields.toBeTested")}><Select value={form.toBeTested} disabled={readOnly || busy} onChange={(e) => change("toBeTested", e.target.value as FormState["toBeTested"])}><Option value="">{t("common.notSpecified", { defaultValue: "تعیین نشده" })}</Option><Option value="true">{t("common.yes", { defaultValue: "بله" })}</Option><Option value="false">{t("common.no", { defaultValue: "خیر" })}</Option></Select></Field>
            {selectField(t("control.fields.testAutomationType"), form.testAutomationType, TEST_AUTOMATION, "testAutomationType", "control.testAutomationType")}
            {selectField(t("control.fields.testingTechnique"), form.testingTechnique, TESTING_TECHNIQUES, "testingTechnique", "control.testingTechnique")}
            {selectField(t("control.fields.evidenceLevel"), form.evidenceLevel, EVIDENCE_LEVELS, "evidenceLevel", "control.evidenceLevel")}
            <Field label={t("control.fields.testPlan")}><Input value="" disabled placeholder={t("control.testPlan.deferred")} /></Field>
            <Field label={t("control.fields.status")}><Select value={form.status} disabled={mode !== "edit" || busy} onChange={(e) => change("status", e.target.value as CentralControlEditableStatus)}><Option value="ACTIVE">{t("control.status.ACTIVE")}</Option><Option value="INACTIVE">{t("control.status.INACTIVE")}</Option></Select></Field>
            <Field label={t("control.fields.createdAt")}><Input value={formatPersianDateTime(value?.createdAt)} readonly /></Field>
            <div className="controlDateRangeRow">
              <Field label={t("control.fields.validFrom")}><PersianDatePicker value={form.validFrom} readonly={readOnly} disabled={busy} accessibleName={t("control.fields.validFrom")} invalidValueMessage={t("control.validation.invalidDate")} onChange={(next) => change("validFrom", next)} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))} /></Field>
              <Field label={t("control.fields.validTo")}><PersianDatePicker value={form.validTo} readonly={readOnly} disabled={busy} accessibleName={t("control.fields.validTo")} invalidValueMessage={t("control.validation.invalidDate")} onChange={(next) => change("validTo", next)} onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))} /></Field>
            </div>
            <Field label={t("control.fields.description")} fullWidth><TextArea rows={5} value={form.description} readonly={readOnly} disabled={busy} onInput={(e) => change("description", e.target.value)} /></Field>
          </div>
        </div>

        <div className={activeTab === "subprocesses" ? "controlTabPanel" : "controlTabPanel controlTabPanelHidden"}>
          {value?.id ? <ControlSubprocessScopesTab controlId={value.id} /> : null}
        </div>

        <div className={activeTab === "documents" ? "controlTabPanel" : "controlTabPanel controlTabPanelHidden"}>
          <DocumentManager targetType="CENTRAL_CONTROL" targetId={value?.id ?? null} readOnly={readOnly || !permissions.documentUpload} showActions={!readOnly && permissions.documentUpload} busy={busy} persistenceMode="PARENT_SAVE" aggregateError={documentError} onDraftStateChange={setDocuments} title={t("control.tabs.documents")} />
        </div>
      </div>

      <div className="controlObjectFooter">
        {mode === "view" ? <><Button design="Emphasized" disabled={busy || !permissions.update} onClick={onEdit}>{t("common.edit", { defaultValue: "ویرایش" })}</Button><Button design="Transparent" disabled={busy} onClick={onCancel}>{t("common.close", { defaultValue: "بستن" })}</Button></> : <><Button design="Emphasized" disabled={saveDisabled} onClick={submit}>{t("control.actions.submit")}</Button><Button design="Transparent" disabled={busy} onClick={onCancel}>{t("common.cancel", { defaultValue: "انصراف" })}</Button></>}
      </div>

      <ControlGroupValueHelpDialog open={groupHelpOpen} groups={groups} selectedId={form.controlGroupId} onClose={() => setGroupHelpOpen(false)} onSelect={(id) => { change("controlGroupId", id); setGroupHelpOpen(false); }} />
    </div>
  );
}

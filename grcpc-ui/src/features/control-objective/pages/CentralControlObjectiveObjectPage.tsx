import { CatalogParentHeader } from "@/shared/components/CatalogParentHeader";
import { DialogFooter } from "@/shared/components/DialogFooter";
import { ControlObjectiveRiskTemplateAssignmentsTab, EMPTY_RISK_CONTROL_OBJECTIVE_ASSIGNMENT_DRAFT_STATE, useRiskControlObjectiveAssignmentPermissions, type RiskControlObjectiveAssignmentDraftState } from "@/features/risk-control-objective-assignment";
import { ControlObjectiveControlAssignmentsTab, useControlControlObjectiveAssignmentPermissions } from "@/features/control-control-objective-assignment";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LocalReverseList } from "@/features/local-master-data";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { Text, ObjectStatus, Input, Label, MessageStrip, Option, Select, Tab, TextArea } from "@ui5/webcomponents-react";

import {
  DocumentManager,
  EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
  toDocumentAggregateRequest,
  type DocumentAggregateDraftError,
  type ParentSaveDocumentDraftState,
} from "@/features/document";
import type { CatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import {
  ControlObjectiveAccountGroupsTab,
  EMPTY_CONTROL_OBJECTIVE_CLASSIFICATION_DRAFT_STATE,
  useControlObjectiveAccountGroupPermissions,
  type ControlObjectiveAccountGroupClassification,
  type ControlObjectiveClassificationDraftState,
} from "@/features/control-objective-account-group";
import {
  ControlObjectiveSubprocessScopesTab,
  useControlObjectiveScopePermissions,
} from "@/features/control-objective-scope";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type {
  CentralControlObjectiveDetail,
  CentralControlObjectiveEditableStatus,
  CentralControlObjectiveMutationResponse,
  CreateCentralControlObjectiveCommand,
  UpdateCentralControlObjectiveCommand,
} from "../domain/centralControlObjective.model";

export type CentralControlObjectiveObjectMode = "create" | "view" | "edit";
export type CentralControlObjectiveTabKey =
  | "general"
  | "subprocesses"
  | "risks"
  | "controls"
  | "accountGroups"
  | "documents";

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
  onSubmit: (
    payload: CreateCentralControlObjectiveCommand | UpdateCentralControlObjectiveCommand,
  ) => Promise<CentralControlObjectiveMutationResponse | null>;
  onCancel: () => void;
  onEdit: () => void;
  onActiveTabChange: (tab: CentralControlObjectiveTabKey) => void;
  onDirtyChange: (dirty: boolean) => void;
  allowAccountGroupNavigation?: boolean;
}

const EMPTY_DATE_DRAFT: PersianDateDraftState = {
  draftValue: "",
  valid: true,
  dirty: false,
};

function toForm(value: CentralControlObjectiveDetail | null, creating = false): FormState {
  return {
    code: value?.code ?? "",
    title: value?.title ?? "",
    description: value?.description ?? "",
    objectiveClass: value?.objectiveClass ?? "",
    status: !creating && value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
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
  allowAccountGroupNavigation = true,
}: Props) {
  const { t } = useTranslation();
  const classificationPermissions = useControlObjectiveAccountGroupPermissions();
  const scopePermissions = useControlObjectiveScopePermissions();
  const riskAssignmentPermissions = useRiskControlObjectiveAssignmentPermissions();
  const controlAssignmentPermissions = useControlControlObjectiveAssignmentPermissions();
  const [form, setForm] = useState<FormState>(() => toForm(value, mode === "create"));
  const [baseline, setBaseline] = useState(() => JSON.stringify(normalized(toForm(value, mode === "create"))));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
  const [classifications, setClassifications] = useState<ControlObjectiveClassificationDraftState>(
    EMPTY_CONTROL_OBJECTIVE_CLASSIFICATION_DRAFT_STATE,
  );
  const [adoptedClassifications, setAdoptedClassifications] = useState<
  ControlObjectiveAccountGroupClassification[] | null>(null);
  const [dateDrafts, setDateDrafts] = useState({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
  const [riskAssignmentDraft, setRiskAssignmentDraft] = useState<RiskControlObjectiveAssignmentDraftState>(EMPTY_RISK_CONTROL_OBJECTIVE_ASSIGNMENT_DRAFT_STATE);
  const scopeRef = useRef(mode === "create" ? "CREATE" : value?.id ?? "EMPTY");

  const readOnly = mode === "view";
  const invalidDate = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const generalDirty = JSON.stringify(normalized(form)) !== baseline || dateDrafts.validFrom.dirty || dateDrafts.validTo.dirty;
  const dirty = generalDirty || documents.dirty || documents.uploading || classifications.dirty || riskAssignmentDraft.dirty;
  const scope = mode === "create" ? "CREATE" : value?.id ?? "EMPTY";

  useEffect(() => {
    if (scopeRef.current === scope && dirty) return;
    const next = toForm(value, mode === "create");
    const timer = window.setTimeout(() => {
      setForm(next);
      setBaseline(JSON.stringify(normalized(next)));
      setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
      setClassifications(EMPTY_CONTROL_OBJECTIVE_CLASSIFICATION_DRAFT_STATE);
      setRiskAssignmentDraft(EMPTY_RISK_CONTROL_OBJECTIVE_ASSIGNMENT_DRAFT_STATE);
      setAdoptedClassifications(null);
      setDateDrafts({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
      scopeRef.current = scope;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dirty, mode, scope, value]);

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
    if (!classifications.ready || classifications.invalid) {
      setValidationError(t("controlObjectiveAccountGroup.validation.notReady"));
      onActiveTabChange("accountGroups");
      return false;
    }
    if (!riskAssignmentDraft.ready || riskAssignmentDraft.invalid) {
      setValidationError(t("centralAssignment.validation.notReady"));
      onActiveTabChange("risks");
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
      accountGroupChanges: classifications.changes,
      riskAssignments: riskAssignmentDraft.changes,
    };
    const payload: CreateCentralControlObjectiveCommand | UpdateCentralControlObjectiveCommand =
      mode === "create"
        ? { ...common, code: form.code.trim().toUpperCase() }
        : { ...common, status: form.status, version: value?.version ?? 0 };
    const result = await onSubmit(payload);
    if (result) {
      setAdoptedClassifications(result.accountGroupClassifications);
      setClassifications(EMPTY_CONTROL_OBJECTIVE_CLASSIFICATION_DRAFT_STATE);
      setBaseline(JSON.stringify(normalized(form)));
      onDirtyChange(false);
    }
  };

  const saveDisabled =
    busy
    || invalidDate
    || documents.uploading
    || documents.invalid
    || !documents.ready
    || classifications.invalid
    || !classifications.ready
    || riskAssignmentDraft.invalid
    || !riskAssignmentDraft.ready
    || (!generalDirty && !documents.dirty && !classifications.dirty && !riskAssignmentDraft.dirty);

  return (
    <div className="controlObjectiveObjectPage">
      <CatalogParentHeader objectTitle={form.title || t("controlObjective.object.title")} standalone />
      <DetailTabContainer
        onTabSelect={(event) => {
          const key = event.detail.tab.getAttribute("data-tab-key") as CentralControlObjectiveTabKey | null;
          if (key === "general" || key === "documents"
            || (key === "subprocesses" && mode !== "create" && scopePermissions.view)
            || (key === "risks" && riskAssignmentPermissions.view)
            || (key === "controls" && mode !== "create" && controlAssignmentPermissions.view)
            || (key === "accountGroups" && classificationPermissions.view)) {
            onActiveTabChange(key);
          }
        }}
      >
        <Tab text={t("controlObjective.tabs.general")} selected={activeTab === "general"} data-tab-key="general" />
        <Tab text={t("controlObjective.tabs.subprocesses")} selected={activeTab === "subprocesses"} disabled={mode === "create" || !scopePermissions.view} data-tab-key="subprocesses" />
        <Tab text={t("controlObjective.tabs.risks")} selected={activeTab === "risks"} disabled={!riskAssignmentPermissions.view} data-tab-key="risks" />
        <Tab text={t("controlObjective.tabs.controls")} selected={activeTab === "controls"} disabled={mode === "create" || !controlAssignmentPermissions.view} data-tab-key="controls" />
        <Tab
          text={t("controlObjective.tabs.accountGroups")}
          selected={activeTab === "accountGroups"}
          disabled={!classificationPermissions.view}
          data-tab-key="accountGroups"
        />
        <Tab text={t("controlObjective.tabs.documents")} selected={activeTab === "documents"} data-tab-key="documents" />
      </DetailTabContainer>

      {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
      {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}

      <div className="controlObjectiveObjectBody">
        <div className={activeTab === "general" ? "controlObjectiveTabPanel" : "controlObjectiveTabPanel controlObjectiveTabPanelHidden"}>
          <div className="controlObjectiveFormGrid modalTwoColumnGrid">
            <Field label={t("controlObjective.fields.code")} required>
              {readOnly ? <Text className="objectPageValue">{(form.code) || "—"}</Text> : <Input value={form.code} readonly={mode !== "create"} disabled={busy} maxlength={64} onInput={(event) => change("code", readValue(event))} />}
            </Field>
            <Field label={t("controlObjective.fields.name")} required>
              {readOnly ? <Text className="objectPageValue">{(form.title) || "—"}</Text> : <Input value={form.title} readonly={readOnly} disabled={busy} maxlength={255} onInput={(event) => change("title", readValue(event))} />}
            </Field>
            <Field label={t("controlObjective.fields.objectiveClass")}>
              {readOnly ? <Text className="objectPageValue">{(form.objectiveClass) || "—"}</Text> : <Input value={form.objectiveClass} readonly={readOnly} disabled={busy} maxlength={255} onInput={(event) => change("objectiveClass", readValue(event))} />}
            </Field>
            <Field label={t("controlObjective.fields.status")}>
              {mode === "create" ? <ObjectStatus state="Positive">{t("common.active")}</ObjectStatus> : readOnly ? <ObjectStatus state={form.status === "ACTIVE" ? "Positive" : "None"}>{t("controlObjective.status." + form.status)}</ObjectStatus> : <Select
                value={form.status}
                disabled={mode !== "edit" || busy}
                accessibleName={t("controlObjective.fields.status")}
                onChange={(event) => change("status", readValue(event) as CentralControlObjectiveEditableStatus)}
              >
                <Option value="ACTIVE">{t("controlObjective.status.ACTIVE")}</Option>
                <Option value="INACTIVE">{t("controlObjective.status.INACTIVE")}</Option>
              </Select>}
            </Field>
            <div className="modalDateRange"><Field label={t("controlObjective.fields.validFrom")}>
              {readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validFrom)) || "—"}</Text> : <PersianDatePicker
                value={form.validFrom}
                readonly={readOnly}
                disabled={busy}
                accessibleName={t("controlObjective.fields.validFrom")}
                invalidValueMessage={t("controlObjective.validation.invalidDate")}
                onChange={(next) => change("validFrom", next)}
                onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))}
              />}
            </Field>
            <Field label={t("controlObjective.fields.validTo")}>
              {readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validTo)) || "—"}</Text> : <PersianDatePicker
                value={form.validTo}
                readonly={readOnly}
                disabled={busy}
                accessibleName={t("controlObjective.fields.validTo")}
                invalidValueMessage={t("controlObjective.validation.invalidDate")}
                onChange={(next) => change("validTo", next)}
                onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))}
              />}
            </Field></div>
            <Field label={t("controlObjective.fields.description")} fullWidth>
              {readOnly ? <Text className="objectPageValue">{(form.description) || "—"}</Text> : <TextArea rows={5} value={form.description} readonly={readOnly} disabled={busy} onInput={(event) => change("description", readValue(event))} />}
            </Field>
          </div>
        </div>

        <div className={activeTab === "subprocesses" ? "controlObjectiveTabPanel" : "controlObjectiveTabPanel controlObjectiveTabPanelHidden"}>
          {value?.id && scopePermissions.view ? <ControlObjectiveSubprocessScopesTab controlObjectiveId={value.id} /> : null}
        </div>

        <div className={activeTab === "risks" ? "controlObjectiveTabPanel" : "controlObjectiveTabPanel controlObjectiveTabPanelHidden"}>
          {riskAssignmentPermissions.view ? <ControlObjectiveRiskTemplateAssignmentsTab canonicalRows={value?.relations?.riskAssignments} controlObjectiveId={value?.id ?? null} readOnly={readOnly} busy={busy} onDraftStateChange={setRiskAssignmentDraft} /> : null}
        </div>

        <div className={activeTab === "controls" ? "controlObjectiveTabPanel" : "controlObjectiveTabPanel controlObjectiveTabPanelHidden"}>
          {value?.id && controlAssignmentPermissions.view ? <ControlObjectiveControlAssignmentsTab controlObjectiveId={value.id} /> : null}
        </div>

        <div className={activeTab === "accountGroups" ? "controlObjectiveTabPanel" : "controlObjectiveTabPanel controlObjectiveTabPanelHidden"}>
          {classificationPermissions.view ? (
            <ControlObjectiveAccountGroupsTab
              controlObjectiveId={value?.id ?? null}
              readOnly={readOnly}
              busy={busy}
              adoptedCanonical={adoptedClassifications ?? value?.relations?.accountGroupClassifications}
              allowAccountGroupNavigation={allowAccountGroupNavigation}
              onDraftStateChange={setClassifications}
            />
          ) : null}
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

      {value?.id && mode === "view" ? <LocalReverseList
        parentId={value.id}
        path={`central/control-objectives/${value.id}/control-objective-scopes`}
        section="control-objective-scopes"
        titleKey="local.reverse.objectiveScopes" titleFa="انتساب‌های محلی این هدف کنترل"
        areas={["PROCESS", "CONTROL"]} /> : null}

      <DialogFooter>
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
      </DialogFooter>
    </div>
  );
}

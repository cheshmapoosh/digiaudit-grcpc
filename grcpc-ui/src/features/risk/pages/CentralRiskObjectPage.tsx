import { CatalogFormGrid } from "@/shared/components/CatalogFormGrid";
import { CatalogParentHeader } from "@/shared/components/CatalogParentHeader";
import { DialogFooter } from "@/shared/components/DialogFooter";
import CatalogRelationDraftTab, {
  type CatalogRelationDraftOption,
  type CatalogRelationLifecycleDraft,
} from "@/shared/components/CatalogRelationDraftTab";
import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";
import { RiskTemplateControlAssignmentsTab, useRiskControlAssignmentPermissions } from "@/features/risk-control-assignment";
import { RiskTemplateControlObjectiveAssignmentsTab, useRiskControlObjectiveAssignmentPermissions } from "@/features/risk-control-objective-assignment";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LocalReverseList } from "@/features/local-master-data";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import { Text, ObjectStatus, Input, Label, MessageStrip, Option, Select, Tab, TextArea } from "@ui5/webcomponents-react";

import type { CatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import {
  DocumentManager,
  EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
  toDocumentAggregateRequest,
  type DocumentAggregateDraftError,
  type ParentSaveDocumentDraftState,
} from "@/features/document";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type {
  CentralRiskCategoryDetail,
  CentralRiskCategorySummary,
  CentralRiskEditableStatus,
  CentralRiskNodeKind,
  CentralRiskTemplateDetail,
  CentralRiskType,
  CreateCentralRiskCategoryCommand,
  CreateCentralRiskTemplateCommand,
  EditCentralRiskCategoryCommand,
  EditCentralRiskTemplateCommand,
} from "../domain/centralRisk.model";
import { collectRiskCategoryDescendantIds } from "../utils/centralRisk.tree";
import { riskTemplateControlsSource, riskTemplateControlObjectivesSource } from "../infra/riskTemplateAssignmentSources";

export type CentralRiskObjectMode = "create" | "view" | "edit";
export type CentralRiskTabKey = "general" | "controls" | "controlObjectives" | "documents";
type RiskDetail = CentralRiskCategoryDetail | CentralRiskTemplateDetail;
type RiskCommand =
  | CreateCentralRiskCategoryCommand
  | EditCentralRiskCategoryCommand
  | CreateCentralRiskTemplateCommand
  | EditCentralRiskTemplateCommand;

interface FormState {
  code: string;
  title: string;
  description: string;
  parentCategoryId: string | null;
  riskType: CentralRiskType | "";
  status: CentralRiskEditableStatus;
  validFrom: string;
  validTo: string;
}

interface Props {
  kind: CentralRiskNodeKind;
  mode: CentralRiskObjectMode;
  value: RiskDetail | null;
  categories: CentralRiskCategorySummary[];
  initialParentCategoryId: string | null;
  activeTab: CentralRiskTabKey;
  busy: boolean;
  permissions: CatalogActionPermissions;
  error: string | null;
  documentError: DocumentAggregateDraftError | null;
  onErrorClose: () => void;
  onSubmit: (payload: RiskCommand) => Promise<boolean>;
  onCancel: () => void;
  onEdit: () => void;
  onActiveTabChange: (tab: CentralRiskTabKey) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const EMPTY_DATE_DRAFT: PersianDateDraftState = {
  draftValue: "",
  valid: true,
  dirty: false,
};
const RISK_TYPES: CentralRiskType[] = ["COMPANY", "OPERATION"];

function templateValue(kind: CentralRiskNodeKind, value: RiskDetail | null) {
  return kind === "template" ? (value as CentralRiskTemplateDetail | null) : null;
}

function resolveParentCategoryId(
  kind: CentralRiskNodeKind,
  value: RiskDetail | null,
  initialParentCategoryId: string | null,
): string | null {
  if (!value) return initialParentCategoryId;
  return kind === "category"
    ? (value as CentralRiskCategoryDetail).parentCategoryId
    : (value as CentralRiskTemplateDetail).riskCategoryId;
}

function toForm(
  kind: CentralRiskNodeKind,
  value: RiskDetail | null,
  initialParentCategoryId: string | null,
  creating = false,
): FormState {
  const template = templateValue(kind, value);
  return {
    code: value?.code ?? "",
    title: value?.title ?? "",
    description: value?.description ?? "",
    parentCategoryId: resolveParentCategoryId(kind, value, initialParentCategoryId),
    riskType: template?.riskType ?? "",
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
    parentCategoryId: form.parentCategoryId,
    riskType: form.riskType,
    status: form.status,
    validFrom: form.validFrom.trim(),
    validTo: form.validTo.trim(),
  };
}

function readValue(event: unknown): string {
  return (event as { target?: { value?: string } }).target?.value ?? "";
}

function Field({
  label,
  required,
  fullWidth,
  children,
}: {
  label: string;
  required?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={fullWidth ? "riskField riskFieldWide" : "riskField"}>
      <Label showColon required={required}>{label}</Label>
      {children}
    </div>
  );
}

export default function CentralRiskObjectPage({
  kind,
  mode,
  value,
  categories,
  initialParentCategoryId,
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
  const controlAssignmentPermissions = useRiskControlAssignmentPermissions();
  const objectiveAssignmentPermissions = useRiskControlObjectiveAssignmentPermissions();
  const riskAccess = useMasterDataAccess("RISK");
  const template = templateValue(kind, value);
  const templateId = mode !== "create" ? template?.id : undefined;
  const canViewControls = Boolean(templateId) && controlAssignmentPermissions.view;
  const canViewControlObjectives = Boolean(templateId) && objectiveAssignmentPermissions.view;
  const canEditControls = mode === "edit" && canViewControls && riskAccess.manage && controlAssignmentPermissions.update;
  const canEditControlObjectives = mode === "edit" && canViewControlObjectives && riskAccess.manage && objectiveAssignmentPermissions.update;
  const selectedTab = (activeTab === "controls" && !canViewControls)
    || (activeTab === "controlObjectives" && !canViewControlObjectives) ? "general" : activeTab;
  const [form, setForm] = useState<FormState>(() => toForm(kind, value, initialParentCategoryId, mode === "create"));
  const [baseline, setBaseline] = useState(() => JSON.stringify(normalized(toForm(kind, value, initialParentCategoryId, mode === "create"))));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
  const [controlDrafts, setControlDrafts] = useState<CatalogRelationDraftOption[]>([]);
  const [objectiveDrafts, setObjectiveDrafts] = useState<CatalogRelationDraftOption[]>([]);
  const [controlLifecycle, setControlLifecycle] = useState<CatalogRelationLifecycleDraft[]>([]);
  const [objectiveLifecycle, setObjectiveLifecycle] = useState<CatalogRelationLifecycleDraft[]>([]);
  const [assignmentPicker, setAssignmentPicker] = useState<"controls" | "controlObjectives" | null>(null);
  const [dateDrafts, setDateDrafts] = useState({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
  const scope = `${kind}:${mode === "create" ? "CREATE" : value?.id ?? "EMPTY"}`;
  const scopeRef = useRef(scope);
  const readOnly = mode === "view";
  const invalidDate = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const generalDirty = JSON.stringify(normalized(form)) !== baseline || dateDrafts.validFrom.dirty || dateDrafts.validTo.dirty;
  const controlsDirty = controlDrafts.length > 0 || controlLifecycle.length > 0;
  const objectivesDirty = objectiveDrafts.length > 0 || objectiveLifecycle.length > 0;
  const assignmentsDirty = controlsDirty || objectivesDirty;
  const assignmentsBlocked = (controlsDirty && !canEditControls) || (objectivesDirty && !canEditControlObjectives);
  const inactiveAssignmentTarget = form.status !== "ACTIVE" && (
    controlDrafts.length > 0 || objectiveDrafts.length > 0
    || controlLifecycle.some(change => change.operation === "ACTIVATE")
    || objectiveLifecycle.some(change => change.operation === "ACTIVATE")
  );
  const dirty = generalDirty || documents.dirty || documents.uploading || assignmentsDirty || Boolean(assignmentPicker);
  const canChangeStatus = mode === "edit" && permissions.lifecycle;

  useEffect(() => {
    if (scopeRef.current === scope && dirty) return;
    const next = toForm(kind, value, initialParentCategoryId, mode === "create");
    const timer = window.setTimeout(() => {
      setForm(next);
      setBaseline(JSON.stringify(normalized(next)));
      setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
      setDateDrafts({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
      setValidationError(null);
      scopeRef.current = scope;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dirty, initialParentCategoryId, kind, mode, scope, value]);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const descendants = useMemo(
    () => new Set(collectRiskCategoryDescendantIds(categories, kind === "category" ? value?.id : null)),
    [categories, kind, value?.id],
  );
  const selectedParent = form.parentCategoryId
    ? categories.find((category) => category.id === form.parentCategoryId) ?? null
    : null;

  const change = <K extends keyof FormState>(key: K, next: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: next }));

  const validate = () => {
    if (!form.code.trim()) {
      setValidationError(t("risk.validation.codeRequired"));
      return false;
    }
    if (!form.title.trim()) {
      setValidationError(t("risk.validation.nameRequired"));
      return false;
    }
    if (kind === "template" && !form.parentCategoryId) {
      setValidationError(t("risk.validation.categoryRequired"));
      return false;
    }
    if (kind === "category" && form.parentCategoryId) {
      if (
        form.parentCategoryId === value?.id ||
        descendants.has(form.parentCategoryId) ||
        !categories.some((category) => category.id === form.parentCategoryId)
      ) {
        setValidationError(t("risk.errors.invalidParent"));
        return false;
      }
    }
    if (kind === "template" && form.parentCategoryId && !categories.some((category) => category.id === form.parentCategoryId)) {
      setValidationError(t("risk.errors.invalidParent"));
      return false;
    }
    if (kind === "template" && !form.riskType) {
      setValidationError(t("risk.validation.riskTypeRequired"));
      return false;
    }
    if (invalidDate) {
      setValidationError(t("risk.validation.invalidDate"));
      return false;
    }
    if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
      setValidationError(t("risk.validation.invalidValidityRange"));
      return false;
    }
    if (!documents.ready || documents.invalid || documents.uploading) {
      setValidationError(t("risk.validation.documentsNotReady"));
      onActiveTabChange("documents");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const submit = async () => {
    if (readOnly || assignmentPicker || assignmentsBlocked || inactiveAssignmentTarget || !validate()) return;
    const common = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      documents: toDocumentAggregateRequest(documents),
    };

    let payload: RiskCommand;
    if (kind === "category") {
      payload = mode === "create"
        ? {
            ...common,
            code: form.code.trim().toUpperCase(),
            parentCategoryId: form.parentCategoryId,
            sortOrder: 0,
          }
        : {
            ...common,
            version: value?.version ?? 0,
            parentCategoryId: form.parentCategoryId,
            sortOrder: (value as CentralRiskCategoryDetail | null)?.sortOrder ?? 0,
            status: form.status,
          };
    } else {
      const riskType = form.riskType as CentralRiskType;
      payload = mode === "create"
        ? {
            ...common,
            code: form.code.trim().toUpperCase(),
            riskCategoryId: form.parentCategoryId!,
            riskType,
            sortOrder: 0,
          }
        : {
            ...common,
            version: value?.version ?? 0,
            riskCategoryId: form.parentCategoryId!,
            riskType,
            sortOrder: (value as CentralRiskTemplateDetail | null)?.sortOrder ?? 0,
            status: form.status,
            controlAssignments: [
              ...controlDrafts.map(({ id, version }) => ({
                controlId: id, operation: "CREATE_OR_RESTORE" as const, controlVersion: version,
              })),
              ...controlLifecycle.map(({ targetId, relationId, ...change }) => ({
                controlId: targetId, assignmentId: relationId, ...change,
              })),
            ],
            controlObjectiveAssignments: [
              ...objectiveDrafts.map(({ id, version }) => ({
                controlObjectiveId: id, operation: "CREATE_OR_RESTORE" as const, controlObjectiveVersion: version,
              })),
              ...objectiveLifecycle.map(({ targetId, relationId, ...change }) => ({
                controlObjectiveId: targetId, assignmentId: relationId, ...change,
              })),
            ],
          };
    }

    if (await onSubmit(payload)) {
      setBaseline(JSON.stringify(normalized(form)));
      onDirtyChange(false);
    }
  };

  const saveDisabled =
    busy ||
    Boolean(assignmentPicker) ||
    assignmentsBlocked ||
    inactiveAssignmentTarget ||
    invalidDate ||
    documents.uploading ||
    documents.invalid ||
    !documents.ready ||
    (!generalDirty && !documents.dirty && !assignmentsDirty);

  const documentTarget = kind === "category" ? "CENTRAL_RISK_CATEGORY" : "CENTRAL_RISK_TEMPLATE";

  const validFromField = (
    <Field label={t("risk.fields.validFrom")}>
      {readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validFrom)) || "—"}</Text> : <PersianDatePicker
        value={form.validFrom}
        readonly={readOnly}
        disabled={busy}
        accessibleName={t("risk.fields.validFrom")}
        invalidValueMessage={t("risk.validation.invalidDate")}
        onChange={(next) => change("validFrom", next)}
        onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))}
      />}
    </Field>
  );
  const validToField = (
    <Field label={t("risk.fields.validTo")}>
      {readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validTo)) || "—"}</Text> : <PersianDatePicker
        value={form.validTo}
        readonly={readOnly}
        disabled={busy}
        accessibleName={t("risk.fields.validTo")}
        invalidValueMessage={t("risk.validation.invalidDate")}
        onChange={(next) => change("validTo", next)}
        onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))}
      />}
    </Field>
  );

  return (
    <>
      <div className="riskObjectPage">
        <CatalogParentHeader objectTitle={form.title || t(`risk.object.${kind}`)} label={t(kind === "category" ? "risk.fields.parentCategory" : "risk.fields.riskCategory")}
          parentId={form.parentCategoryId} required={kind === "template"}
          parent={selectedParent ? { code: selectedParent.code, title: selectedParent.title, type: t("risk.nodeType.category"), status: selectedParent.status } : null} />

        <DetailTabContainer
          onTabSelect={(event) => {
            const key = event.detail.tab.getAttribute("data-tab-key");
            if (key === "general" || key === "documents"
              || (key === "controls" && canViewControls)
              || (key === "controlObjectives" && canViewControlObjectives)) {
              onActiveTabChange(key);
            }
          }}
        >
          <Tab text={t("risk.tabs.general")} selected={selectedTab === "general"} data-tab-key="general" />
          {kind === "template" ? (
            <Tab text={t("risk.tabs.controls")} selected={selectedTab === "controls"} disabled={!canViewControls} data-tab-key="controls" />
          ) : null}
          {kind === "template" ? (
            <Tab text={t("risk.tabs.controlObjectives")} selected={selectedTab === "controlObjectives"} disabled={!canViewControlObjectives} data-tab-key="controlObjectives" />
          ) : null}
          <Tab text={t("risk.tabs.documents")} selected={selectedTab === "documents"} data-tab-key="documents" />
        </DetailTabContainer>

        {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
        {assignmentsBlocked ? <MessageStrip design="Negative" hideCloseButton>{t("common.dataAccessRequired")}</MessageStrip> : null}
        {validationError ? (
          <MessageStrip design="Negative" onClose={() => setValidationError(null)}>
            {validationError}
          </MessageStrip>
        ) : null}

        <div className="riskObjectBody">
          <div className={selectedTab === "general" ? "riskTabPanel" : "riskTabPanel riskTabPanelHidden"}>
            <CatalogFormGrid className={kind === "category" ? "riskFormGrid modalTwoColumnGrid" : "riskFormGrid"}>
              <Field label={t("risk.fields.code")} required>
                {readOnly ? <Text className="objectPageValue">{(form.code) || "—"}</Text> : <Input
                  value={form.code}
                  readonly={mode !== "create"}
                  disabled={busy}
                  maxlength={64}
                  onInput={(event) => change("code", readValue(event))}
                />}
              </Field>
              <Field label={t("risk.fields.name")} required>
                {readOnly ? <Text className="objectPageValue">{(form.title) || "—"}</Text> : <Input
                  value={form.title}
                  readonly={readOnly}
                  disabled={busy}
                  maxlength={255}
                  onInput={(event) => change("title", readValue(event))}
                />}
              </Field>
              {kind === "template" ? (
                <Field label={t("risk.fields.riskType")} required>
                  {readOnly ? <Text className="objectPageValue">{(form.riskType ? t("risk.riskType." + form.riskType) : "—") || "—"}</Text> : <Select
                    value={form.riskType}
                    disabled={readOnly || busy}
                    onChange={(event) => change("riskType", readValue(event) as FormState["riskType"])}
                  >
                    <Option value="">{t("common.notSpecified", { defaultValue: "تعیین نشده" })}</Option>
                    {RISK_TYPES.map((riskType) => (
                      <Option key={riskType} value={riskType}>{t(`risk.riskType.${riskType}`)}</Option>
                    ))}
                  </Select>}
                </Field>
              ) : null}
              <Field label={t("risk.fields.status")}>
                {mode === "create" ? <ObjectStatus state="Positive">{t("common.active")}</ObjectStatus> : readOnly ? <ObjectStatus state={form.status === "ACTIVE" ? "Positive" : "None"}>{t("risk.status." + form.status)}</ObjectStatus> : <Select
                  value={form.status}
                  disabled={!canChangeStatus || busy}
                  accessibleName={t("risk.fields.status")}
                  onChange={(event) => change("status", readValue(event) as CentralRiskEditableStatus)}
                >
                  <Option value="ACTIVE">{t("risk.status.ACTIVE")}</Option>
                  <Option value="INACTIVE">{t("risk.status.INACTIVE")}</Option>
                </Select>}
              </Field>

              <div className="riskDateRange">
                {validFromField}
                {validToField}
              </div>

              <Field label={t("risk.fields.description")} fullWidth>
                {readOnly ? <Text className="objectPageValue">{(form.description) || "—"}</Text> : <TextArea
                  rows={3}
                  value={form.description}
                  readonly={readOnly}
                  disabled={busy}
                  onInput={(event) => change("description", readValue(event))}
                />}
              </Field>
            </CatalogFormGrid>
          </div>

          {templateId && canViewControls ? (
            <div className={selectedTab === "controls" ? "riskTabPanel" : "riskTabPanel riskTabPanelHidden"}>
              {canEditControls ? <CatalogRelationDraftTab source={riskTemplateControlsSource} ownerId={templateId}
                busy={busy} editable active={form.status === "ACTIVE"}
                drafts={controlDrafts} onDraftsChange={setControlDrafts}
                lifecycleChanges={controlLifecycle} onLifecycleChangesChange={setControlLifecycle}
                pickerOpen={assignmentPicker === "controls"}
                onPickerOpenChange={open => setAssignmentPicker(open ? "controls" : null)} />
                : <RiskTemplateControlAssignmentsTab riskTemplateId={templateId} canonicalRows={readOnly ? template?.controlAssignments : undefined} />}
            </div>
          ) : null}
          {templateId && canViewControlObjectives ? (
            <div className={selectedTab === "controlObjectives" ? "riskTabPanel" : "riskTabPanel riskTabPanelHidden"}>
              {canEditControlObjectives ? <CatalogRelationDraftTab source={riskTemplateControlObjectivesSource} ownerId={templateId}
                busy={busy} editable active={form.status === "ACTIVE"}
                drafts={objectiveDrafts} onDraftsChange={setObjectiveDrafts}
                lifecycleChanges={objectiveLifecycle} onLifecycleChangesChange={setObjectiveLifecycle}
                pickerOpen={assignmentPicker === "controlObjectives"}
                onPickerOpenChange={open => setAssignmentPicker(open ? "controlObjectives" : null)} />
                : <RiskTemplateControlObjectiveAssignmentsTab riskTemplateId={templateId} canonicalRows={readOnly ? template?.controlObjectiveAssignments : undefined} />}
            </div>
          ) : null}

          <div className={selectedTab === "documents" ? "riskTabPanel" : "riskTabPanel riskTabPanelHidden"}>
            <DocumentManager
              targetType={documentTarget}
              targetId={value?.id ?? null}
              readOnly={readOnly || !permissions.documentUpload}
              showActions={!readOnly && permissions.documentUpload}
              busy={busy}
              persistenceMode="PARENT_SAVE"
              aggregateError={documentError}
              onDraftStateChange={setDocuments}
              title={t("risk.tabs.documents")}
            />
          </div>
        </div>

        {templateId && readOnly ? (
          <div hidden={selectedTab === "controls" || selectedTab === "controlObjectives"}>
            <LocalReverseList
              parentId={templateId}
              path={`central/risk-templates/${templateId}/risk-scopes`}
              section="risk-scopes"
              titleKey="local.reverse.riskScopes" titleFa="انتساب‌های این الگوی ریسک"
              areas={["PROCESS", "RISK"]} />
          </div>
        ) : null}

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
                {t("risk.actions.submit")}
              </Button>
              <Button design="Transparent" disabled={busy} onClick={onCancel}>
                {t("common.cancel", { defaultValue: "انصراف" })}
              </Button>
            </>
          )}
        </DialogFooter>
      </div>

    </>
  );
}

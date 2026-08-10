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
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import RiskCategoryValueHelpDialog from "../components/RiskCategoryValueHelpDialog";
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

export type CentralRiskObjectMode = "create" | "view" | "edit";
export type CentralRiskTabKey = "general" | "risk" | "controlCenter" | "documents";
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
): FormState {
  const template = templateValue(kind, value);
  return {
    code: value?.code ?? "",
    title: value?.title ?? "",
    description: value?.description ?? "",
    parentCategoryId: resolveParentCategoryId(kind, value, initialParentCategoryId),
    riskType: template?.riskType ?? "",
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
  const [form, setForm] = useState<FormState>(() => toForm(kind, value, initialParentCategoryId));
  const [baseline, setBaseline] = useState(() => JSON.stringify(normalized(toForm(kind, value, initialParentCategoryId))));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
  const [dateDrafts, setDateDrafts] = useState({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
  const scope = `${kind}:${mode === "create" ? "CREATE" : value?.id ?? "EMPTY"}`;
  const scopeRef = useRef(scope);
  const readOnly = mode === "view";
  const invalidDate = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const generalDirty = JSON.stringify(normalized(form)) !== baseline || dateDrafts.validFrom.dirty || dateDrafts.validTo.dirty;
  const dirty = generalDirty || documents.dirty || documents.uploading;
  const canChangeParent = !readOnly && (mode === "create" || permissions.move);
  const canChangeStatus = mode === "edit" && permissions.lifecycle;

  useEffect(() => {
    if (scopeRef.current === scope && dirty) return;
    const next = toForm(kind, value, initialParentCategoryId);
    const timer = window.setTimeout(() => {
      setForm(next);
      setBaseline(JSON.stringify(normalized(next)));
      setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
      setDateDrafts({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
      setValidationError(null);
      scopeRef.current = scope;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dirty, initialParentCategoryId, kind, scope, value]);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const descendants = useMemo(
    () => new Set(collectRiskCategoryDescendantIds(categories, kind === "category" ? value?.id : null)),
    [categories, kind, value?.id],
  );
  const selectedParent = form.parentCategoryId
    ? categories.find((category) => category.id === form.parentCategoryId) ?? null
    : null;
  const parentLabel = selectedParent
    ? `${selectedParent.code} — ${selectedParent.title}`
    : kind === "category"
      ? t("risk.parent.none")
      : "-";

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
    if (readOnly || !validate()) return;
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
          };
    }

    if (await onSubmit(payload)) {
      setBaseline(JSON.stringify(normalized(form)));
      onDirtyChange(false);
    }
  };

  const saveDisabled =
    busy ||
    invalidDate ||
    documents.uploading ||
    documents.invalid ||
    !documents.ready ||
    (!generalDirty && !documents.dirty);

  const headerValues = useMemo(
    () => [
      [t("risk.fields.code"), form.code || "-"],
      [t("risk.fields.createdAt"), formatPersianDateTime(value?.createdAt)],
      [t("risk.fields.validTo"), formatPersianDate(form.validTo)],
      [t("risk.fields.status"), t(`risk.status.${form.status}`)],
    ],
    [form.code, form.status, form.validTo, t, value?.createdAt],
  );
  const documentTarget = kind === "category" ? "CENTRAL_RISK_CATEGORY" : "CENTRAL_RISK_TEMPLATE";

  const validFromField = (
    <Field label={t("risk.fields.validFrom")}>
      <PersianDatePicker
        value={form.validFrom}
        readonly={readOnly}
        disabled={busy}
        accessibleName={t("risk.fields.validFrom")}
        invalidValueMessage={t("risk.validation.invalidDate")}
        onChange={(next) => change("validFrom", next)}
        onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))}
      />
    </Field>
  );
  const validToField = (
    <Field label={t("risk.fields.validTo")}>
      <PersianDatePicker
        value={form.validTo}
        readonly={readOnly}
        disabled={busy}
        accessibleName={t("risk.fields.validTo")}
        invalidValueMessage={t("risk.validation.invalidDate")}
        onChange={(next) => change("validTo", next)}
        onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))}
      />
    </Field>
  );

  return (
    <>
      <div className="riskObjectPage">
        <div className="riskObjectHeader">
          <Title level="H4">{form.title || t(`risk.object.${kind}`)}</Title>
          <div className="riskHeaderGrid">
            {headerValues.map(([label, displayValue]) => (
              <div className="riskHeaderItem" key={label}>
                <Label showColon>{label}</Label>
                <Input value={displayValue} readonly />
              </div>
            ))}
          </div>
        </div>

        <DetailTabContainer
          onTabSelect={(event) => {
            const key = event.detail.tab.getAttribute("data-tab-key") as CentralRiskTabKey | null;
            if (key === "general" || key === "documents") onActiveTabChange(key);
          }}
        >
          <Tab text={t("risk.tabs.general")} selected={activeTab === "general"} data-tab-key="general" />
          {kind === "template" ? <Tab text={t("risk.tabs.risk")} disabled data-tab-key="risk" /> : null}
          {kind === "template" ? <Tab text={t("risk.tabs.controlCenter")} disabled data-tab-key="controlCenter" /> : null}
          <Tab text={t("risk.tabs.documents")} selected={activeTab === "documents"} data-tab-key="documents" />
        </DetailTabContainer>

        {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
        {validationError ? (
          <MessageStrip design="Negative" onClose={() => setValidationError(null)}>
            {validationError}
          </MessageStrip>
        ) : null}

        <div className="riskObjectBody">
          <div className={activeTab === "general" ? "riskTabPanel" : "riskTabPanel riskTabPanelHidden"}>
            <div className="riskFormGrid">
              <Field label={t("risk.fields.code")} required>
                <Input
                  value={form.code}
                  readonly={mode !== "create"}
                  disabled={busy}
                  maxlength={64}
                  onInput={(event) => change("code", readValue(event))}
                />
              </Field>
              <Field label={t("risk.fields.name")} required>
                <Input
                  value={form.title}
                  readonly={readOnly}
                  disabled={busy}
                  maxlength={255}
                  onInput={(event) => change("title", readValue(event))}
                />
              </Field>
              <Field label={t(kind === "category" ? "risk.fields.parentCategory" : "risk.fields.riskCategory")} required={kind === "template"}>
                <div className="riskParentField">
                  <Input value={parentLabel} readonly />
                  {canChangeParent ? (
                    <Button disabled={busy} onClick={() => setParentDialogOpen(true)}>
                      {t("risk.parent.select")}
                    </Button>
                  ) : null}
                </div>
              </Field>
              {kind === "template" ? (
                <Field label={t("risk.fields.riskType")} required>
                  <Select
                    value={form.riskType}
                    disabled={readOnly || busy}
                    onChange={(event) => change("riskType", readValue(event) as FormState["riskType"])}
                  >
                    <Option value="">{t("common.notSpecified", { defaultValue: "تعیین نشده" })}</Option>
                    {RISK_TYPES.map((riskType) => (
                      <Option key={riskType} value={riskType}>{t(`risk.riskType.${riskType}`)}</Option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <Field label={t("risk.fields.status")}>
                <Select
                  value={form.status}
                  disabled={!canChangeStatus || busy}
                  accessibleName={t("risk.fields.status")}
                  onChange={(event) => change("status", readValue(event) as CentralRiskEditableStatus)}
                >
                  <Option value="ACTIVE">{t("risk.status.ACTIVE")}</Option>
                  <Option value="INACTIVE">{t("risk.status.INACTIVE")}</Option>
                </Select>
              </Field>

              {kind === "template" ? (
                <div className="riskDateRange">
                  {validFromField}
                  {validToField}
                </div>
              ) : (
                <>
                  {validFromField}
                  {validToField}
                </>
              )}

              <Field label={t("risk.fields.description")} fullWidth>
                <TextArea
                  rows={5}
                  value={form.description}
                  readonly={readOnly}
                  disabled={busy}
                  onInput={(event) => change("description", readValue(event))}
                />
              </Field>
            </div>
          </div>

          <div className={activeTab === "documents" ? "riskTabPanel" : "riskTabPanel riskTabPanelHidden"}>
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

        <div className="riskObjectFooter">
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
        </div>
      </div>

      <RiskCategoryValueHelpDialog
        open={parentDialogOpen}
        categories={categories}
        currentCategoryId={kind === "category" && mode === "edit" ? value?.id ?? null : null}
        selectedCategoryId={form.parentCategoryId}
        requiredParent={kind === "template"}
        busy={busy}
        onClose={() => setParentDialogOpen(false)}
        onSelect={(categoryId) => change("parentCategoryId", categoryId)}
      />
    </>
  );
}

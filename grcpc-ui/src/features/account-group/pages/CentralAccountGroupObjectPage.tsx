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
import AccountGroupParentValueHelpDialog from "../components/AccountGroupParentValueHelpDialog";
import {
  CENTRAL_ACCOUNT_GROUP_IMPORTANCE,
  type CentralAccountGroupDetail,
  type CentralAccountGroupEditableStatus,
  type CentralAccountGroupImportance,
  type CentralAccountGroupSummary,
  type CreateCentralAccountGroupCommand,
  type EditCentralAccountGroupCommand,
} from "../domain/centralAccountGroup.model";
import { collectAccountGroupDescendantIds } from "../utils/centralAccountGroup.tree";

export type CentralAccountGroupObjectMode = "create" | "view" | "edit";
export type CentralAccountGroupTabKey = "general" | "risks" | "documents";
type AccountGroupCommand = CreateCentralAccountGroupCommand | EditCentralAccountGroupCommand;

interface FormState {
  code: string;
  title: string;
  parentAccountGroupId: string | null;
  importance: CentralAccountGroupImportance;
  reasonableAssurance: boolean;
  status: CentralAccountGroupEditableStatus;
  validFrom: string;
  validTo: string;
  description: string;
}

interface Props {
  mode: CentralAccountGroupObjectMode;
  value: CentralAccountGroupDetail | null;
  rows: CentralAccountGroupSummary[];
  initialParentId: string | null;
  activeTab: CentralAccountGroupTabKey;
  busy: boolean;
  permissions: CatalogActionPermissions;
  error: string | null;
  documentError: DocumentAggregateDraftError | null;
  onErrorClose: () => void;
  onSubmit: (payload: AccountGroupCommand) => Promise<boolean>;
  onCancel: () => void;
  onEdit: () => void;
  onActiveTabChange: (tab: CentralAccountGroupTabKey) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const EMPTY_DATE_DRAFT: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };

function toForm(value: CentralAccountGroupDetail | null, initialParentId: string | null): FormState {
  return {
    code: value?.code ?? "",
    title: value?.title ?? "",
    parentAccountGroupId: value?.parentAccountGroupId ?? initialParentId,
    importance: value?.importance ?? "MEDIUM",
    reasonableAssurance: value?.reasonableAssurance ?? false,
    status: value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    validFrom: value?.validFrom ?? "",
    validTo: value?.validTo ?? "",
    description: value?.description ?? "",
  };
}

function normalized(form: FormState) {
  return {
    code: form.code.trim().toUpperCase(),
    title: form.title.trim(),
    parentAccountGroupId: form.parentAccountGroupId,
    importance: form.importance,
    reasonableAssurance: form.reasonableAssurance,
    status: form.status,
    validFrom: form.validFrom.trim(),
    validTo: form.validTo.trim(),
    description: form.description.trim(),
  };
}

function readValue(event: unknown): string {
  return (event as { target?: { value?: string } }).target?.value ?? "";
}

function Field({ label, required, fullWidth, children }: {
  label: string;
  required?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={fullWidth ? "accountGroupField accountGroupFieldWide" : "accountGroupField"}>
      <Label showColon required={required}>{label}</Label>
      {children}
    </div>
  );
}

export default function CentralAccountGroupObjectPage({
  mode,
  value,
  rows,
  initialParentId,
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
  const [form, setForm] = useState<FormState>(() => toForm(value, initialParentId));
  const [baseline, setBaseline] = useState(() => JSON.stringify(normalized(toForm(value, initialParentId))));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
  const [dateDrafts, setDateDrafts] = useState({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
  const scope = `${mode === "create" ? "CREATE" : value?.id ?? "EMPTY"}:${mode}`;
  const scopeRef = useRef(scope);
  const readOnly = mode === "view";
  const invalidDate = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const generalDirty = JSON.stringify(normalized(form)) !== baseline || dateDrafts.validFrom.dirty || dateDrafts.validTo.dirty;
  const dirty = generalDirty || documents.dirty || documents.uploading;
  const canChangeParent = !readOnly && (mode === "create" || permissions.move);
  const canChangeStatus = mode === "edit" && permissions.lifecycle;

  useEffect(() => {
    if (scopeRef.current === scope && dirty) return;
    const next = toForm(value, initialParentId);
    const timer = window.setTimeout(() => {
      setForm(next);
      setBaseline(JSON.stringify(normalized(next)));
      setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
      setDateDrafts({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
      setValidationError(null);
      scopeRef.current = scope;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dirty, initialParentId, scope, value]);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const descendants = useMemo(
    () => new Set(collectAccountGroupDescendantIds(rows, mode === "edit" ? value?.id : null)),
    [mode, rows, value?.id],
  );
  const selectedParent = form.parentAccountGroupId
    ? rows.find((row) => row.id === form.parentAccountGroupId) ?? null
    : null;
  const parentLabel = selectedParent ? `${selectedParent.code} — ${selectedParent.title}` : t("accountGroup.parent.none");

  const change = <K extends keyof FormState>(key: K, next: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: next }));

  const validate = () => {
    if (!form.code.trim()) return setValidationError(t("accountGroup.validation.codeRequired")), false;
    if (!form.title.trim()) return setValidationError(t("accountGroup.validation.nameRequired")), false;
    if (!form.importance) return setValidationError(t("accountGroup.validation.importanceRequired")), false;
    if (
      form.parentAccountGroupId &&
      (form.parentAccountGroupId === value?.id ||
        descendants.has(form.parentAccountGroupId) ||
        !rows.some((row) => row.id === form.parentAccountGroupId))
    ) {
      return setValidationError(t("accountGroup.errors.invalidParent")), false;
    }
    if (invalidDate) return setValidationError(t("accountGroup.validation.invalidDate")), false;
    if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
      return setValidationError(t("accountGroup.validation.invalidValidityRange")), false;
    }
    if (!documents.ready || documents.invalid || documents.uploading) {
      setValidationError(t("accountGroup.validation.documentsNotReady"));
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
      importance: form.importance,
      reasonableAssurance: form.reasonableAssurance,
      description: form.description.trim() || null,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      documents: toDocumentAggregateRequest(documents),
    };
    const payload: AccountGroupCommand = mode === "create"
      ? {
          ...common,
          code: form.code.trim().toUpperCase(),
          parentAccountGroupId: form.parentAccountGroupId,
          sortOrder: 0,
        }
      : {
          ...common,
          version: value?.version ?? 0,
          parentAccountGroupId: form.parentAccountGroupId,
          sortOrder: value?.sortOrder ?? 0,
          status: form.status,
        };
    if (await onSubmit(payload)) {
      setBaseline(JSON.stringify(normalized(form)));
      onDirtyChange(false);
    }
  };

  const saveDisabled = busy || invalidDate || documents.uploading || documents.invalid || !documents.ready || (!generalDirty && !documents.dirty);
  const headerValues = useMemo(
    () => [
      [t("accountGroup.fields.code"), form.code || "-"],
      [t("accountGroup.fields.createdAt"), formatPersianDateTime(value?.createdAt)],
      [t("accountGroup.fields.validity"), `${formatPersianDate(form.validFrom)} - ${formatPersianDate(form.validTo)}`],
      [t("accountGroup.fields.status"), t(`accountGroup.status.${form.status}`)],
    ],
    [form.code, form.status, form.validFrom, form.validTo, t, value?.createdAt],
  );

  return (
    <>
      <div className="accountGroupObjectPage">
        <div className="accountGroupObjectHeader">
          <Title level="H4">{form.title || t("accountGroup.object.title")}</Title>
          <div className="accountGroupHeaderGrid">
            {headerValues.map(([label, displayValue]) => (
              <div className="accountGroupHeaderItem" key={label}>
                <Label showColon>{label}</Label>
                <Input value={displayValue} readonly />
              </div>
            ))}
          </div>
        </div>

        <DetailTabContainer
          onTabSelect={(event) => {
            const key = event.detail.tab.getAttribute("data-tab-key") as CentralAccountGroupTabKey | null;
            if (key === "general" || key === "documents") onActiveTabChange(key);
          }}
        >
          <Tab text={t("accountGroup.tabs.general")} selected={activeTab === "general"} data-tab-key="general" />
          <Tab text={t("accountGroup.tabs.risks")} disabled data-tab-key="risks" />
          <Tab text={t("accountGroup.tabs.documents")} selected={activeTab === "documents"} data-tab-key="documents" />
        </DetailTabContainer>

        {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
        {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}

        <div className="accountGroupObjectBody">
          <div className={activeTab === "general" ? "accountGroupTabPanel" : "accountGroupTabPanel accountGroupTabPanelHidden"}>
            <div className="accountGroupFormGrid">
              <Field label={t("accountGroup.fields.code")} required>
                <Input
                  value={form.code}
                  readonly={mode !== "create"}
                  disabled={busy}
                  maxlength={64}
                  onInput={(event) => change("code", readValue(event))}
                />
              </Field>
              <Field label={t("accountGroup.fields.name")} required>
                <Input
                  value={form.title}
                  readonly={readOnly}
                  disabled={busy}
                  maxlength={255}
                  onInput={(event) => change("title", readValue(event))}
                />
              </Field>
              <Field label={t("accountGroup.fields.parent")}>
                <div className="accountGroupParentField">
                  <Input value={parentLabel} readonly />
                  {canChangeParent ? (
                    <Button disabled={busy} onClick={() => setParentDialogOpen(true)}>
                      {t("accountGroup.parent.select")}
                    </Button>
                  ) : null}
                </div>
              </Field>
              <Field label={t("accountGroup.fields.status")}>
                <Select
                  value={form.status}
                  disabled={!canChangeStatus || busy}
                  onChange={(event) => change("status", readValue(event) as CentralAccountGroupEditableStatus)}
                >
                  <Option value="ACTIVE">{t("accountGroup.status.ACTIVE")}</Option>
                  <Option value="INACTIVE">{t("accountGroup.status.INACTIVE")}</Option>
                </Select>
              </Field>
              <Field label={t("accountGroup.fields.importance")} required>
                <Select
                  value={form.importance}
                  disabled={readOnly || busy}
                  onChange={(event) => change("importance", readValue(event) as CentralAccountGroupImportance)}
                >
                  {CENTRAL_ACCOUNT_GROUP_IMPORTANCE.map((importance) => (
                    <Option key={importance} value={importance}>{t(`accountGroup.importance.${importance}`)}</Option>
                  ))}
                </Select>
              </Field>
              <Field label={t("accountGroup.fields.reasonableAssurance")}>
                <Select
                  value={form.reasonableAssurance ? "true" : "false"}
                  disabled={readOnly || busy}
                  onChange={(event) => change("reasonableAssurance", readValue(event) === "true")}
                >
                  <Option value="true">{t("common.yes", { defaultValue: "بله" })}</Option>
                  <Option value="false">{t("common.no", { defaultValue: "خیر" })}</Option>
                </Select>
              </Field>

              <div className="accountGroupDateRange">
                <Field label={t("accountGroup.fields.validFrom")}>
                  <PersianDatePicker
                    value={form.validFrom}
                    readonly={readOnly}
                    disabled={busy}
                    accessibleName={t("accountGroup.fields.validFrom")}
                    invalidValueMessage={t("accountGroup.validation.invalidDate")}
                    onChange={(next) => change("validFrom", next)}
                    onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))}
                  />
                </Field>
                <Field label={t("accountGroup.fields.validTo")}>
                  <PersianDatePicker
                    value={form.validTo}
                    readonly={readOnly}
                    disabled={busy}
                    accessibleName={t("accountGroup.fields.validTo")}
                    invalidValueMessage={t("accountGroup.validation.invalidDate")}
                    onChange={(next) => change("validTo", next)}
                    onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))}
                  />
                </Field>
              </div>

              <Field label={t("accountGroup.fields.description")} fullWidth>
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

          <div className={activeTab === "documents" ? "accountGroupTabPanel" : "accountGroupTabPanel accountGroupTabPanelHidden"}>
            <DocumentManager
              targetType="CENTRAL_ACCOUNT_GROUP"
              targetId={value?.id ?? null}
              readOnly={readOnly || !permissions.documentUpload}
              showActions={!readOnly && permissions.documentUpload}
              busy={busy}
              persistenceMode="PARENT_SAVE"
              aggregateError={documentError}
              onDraftStateChange={setDocuments}
              title={t("accountGroup.tabs.documents")}
            />
          </div>
        </div>

        <div className="accountGroupObjectFooter">
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
                {t("accountGroup.actions.submit")}
              </Button>
              <Button design="Transparent" disabled={busy} onClick={onCancel}>
                {t("common.cancel", { defaultValue: "انصراف" })}
              </Button>
            </>
          )}
        </div>
      </div>

      <AccountGroupParentValueHelpDialog
        open={parentDialogOpen}
        rows={rows}
        currentId={mode === "edit" ? value?.id ?? null : null}
        selectedParentId={form.parentAccountGroupId}
        busy={busy}
        onClose={() => setParentDialogOpen(false)}
        onSelect={(parentId) => {
          change("parentAccountGroupId", parentId);
          setParentDialogOpen(false);
        }}
      />
    </>
  );
}

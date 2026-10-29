import { CatalogFormGrid } from "@/shared/components/CatalogFormGrid";
import { CatalogParentHeader } from "@/shared/components/CatalogParentHeader";
import { DialogFooter } from "@/shared/components/DialogFooter";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
import { AccountGroupControlsTab, useControlAccountGroupPermissions } from "@/features/control-account-group";
import {
  AccountGroupControlObjectivesTab,
  useControlObjectiveAccountGroupPermissions,
} from "@/features/control-objective-account-group";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate } from "@/shared/utils/date.utils";
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
export type CentralAccountGroupTabKey =
  | "general"
  | "controls"
  | "controlObjectives"
  | "risks"
  | "documents";
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

function toForm(value: CentralAccountGroupDetail | null, initialParentId: string | null, creating = false): FormState {
  return {
    code: value?.code ?? "",
    title: value?.title ?? "",
    parentAccountGroupId: value?.parentAccountGroupId ?? initialParentId,
    importance: value?.importance ?? "MEDIUM",
    reasonableAssurance: value?.reasonableAssurance ?? false,
    status: !creating && value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
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
  const classificationPermissions = useControlAccountGroupPermissions();
  const objectiveClassificationPermissions = useControlObjectiveAccountGroupPermissions();
  const [form, setForm] = useState<FormState>(() => toForm(value, initialParentId, mode === "create"));
  const [baseline, setBaseline] = useState(() => JSON.stringify(normalized(toForm(value, initialParentId, mode === "create"))));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
  const [dateDrafts, setDateDrafts] = useState({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
  const scope = `${mode === "create" ? "CREATE" : value?.id ?? "EMPTY"}:${mode}`;
  const scopeRef = useRef(scope);
  const readOnly = mode === "view";
  const invalidDate = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const generalDirty = JSON.stringify(normalized(form)) !== baseline || dateDrafts.validFrom.dirty || dateDrafts.validTo.dirty;
  const dirty = generalDirty || documents.dirty || documents.uploading || parentDialogOpen;
  const canChangeParent = !readOnly && (mode === "create" || permissions.move);
  const canChangeStatus = mode === "edit" && permissions.lifecycle;

  useEffect(() => {
    if (scopeRef.current === scope && dirty) return;
    const next = toForm(value, initialParentId, mode === "create");
    const timer = window.setTimeout(() => {
      setForm(next);
      setBaseline(JSON.stringify(normalized(next)));
      setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
      setDateDrafts({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
      setValidationError(null);
      scopeRef.current = scope;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dirty, initialParentId, mode, scope, value]);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const descendants = useMemo(
    () => new Set(collectAccountGroupDescendantIds(rows, mode === "edit" ? value?.id : null)),
    [mode, rows, value?.id],
  );
  const selectedParent = form.parentAccountGroupId
    ? rows.find((row) => row.id === form.parentAccountGroupId) ?? null
    : null;

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

  const saveDisabled = busy || parentDialogOpen || invalidDate || documents.uploading || documents.invalid || !documents.ready || (!generalDirty && !documents.dirty);

  return (
    <>
      <div className="accountGroupObjectPage">
        <CatalogParentHeader objectTitle={form.title || t("accountGroup.object.title")} label={t("accountGroup.fields.parent")} parentId={form.parentAccountGroupId}
          busy={busy} onClearParent={canChangeParent ? () => change("parentAccountGroupId", null) : undefined}
          parent={selectedParent ? { code: selectedParent.code, title: selectedParent.title, type: t("accountGroup.object.title"), status: selectedParent.status } : null}
          selection={canChangeParent ? <Button design="Emphasized" disabled={busy} onClick={() => setParentDialogOpen(true)}>{t("catalog.parentHeader.select")}</Button> : null} />

        <DetailTabContainer
          onTabSelect={(event) => {
            const key = event.detail.tab.getAttribute("data-tab-key") as CentralAccountGroupTabKey | null;
            if (key === "general" || key === "documents"
              || (key === "controls" && value?.id && classificationPermissions.view)
              || (key === "controlObjectives" && value?.id
                && objectiveClassificationPermissions.view)) onActiveTabChange(key);
          }}
        >
          <Tab text={t("accountGroup.tabs.general")} selected={activeTab === "general"} data-tab-key="general" />
          <Tab text={t("accountGroup.tabs.controls", { defaultValue: "Controls" })} selected={activeTab === "controls"} disabled={!value?.id || !classificationPermissions.view} data-tab-key="controls" />
          <Tab
            text={t("accountGroup.tabs.controlObjectives")}
            selected={activeTab === "controlObjectives"}
            disabled={!value?.id || !objectiveClassificationPermissions.view}
            data-tab-key="controlObjectives"
          />
          <Tab text={t("accountGroup.tabs.risks")} disabled data-tab-key="risks" />
          <Tab text={t("accountGroup.tabs.documents")} selected={activeTab === "documents"} data-tab-key="documents" />
        </DetailTabContainer>

        {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
        {validationError ? <MessageStrip design="Negative" onClose={() => setValidationError(null)}>{validationError}</MessageStrip> : null}

        <div className="accountGroupObjectBody">
          <div className={activeTab === "general" ? "accountGroupTabPanel" : "accountGroupTabPanel accountGroupTabPanelHidden"}>
            <CatalogFormGrid className="accountGroupFormGrid">
              <Field label={t("accountGroup.fields.code")} required>
                {readOnly ? <Text className="objectPageValue">{(form.code) || "—"}</Text> : <Input
                  value={form.code}
                  readonly={mode !== "create"}
                  disabled={busy}
                  maxlength={64}
                  onInput={(event) => change("code", readValue(event))}
                />}
              </Field>
              <Field label={t("accountGroup.fields.name")} required>
                {readOnly ? <Text className="objectPageValue">{(form.title) || "—"}</Text> : <Input
                  value={form.title}
                  readonly={readOnly}
                  disabled={busy}
                  maxlength={255}
                  onInput={(event) => change("title", readValue(event))}
                />}
              </Field>
              <Field label={t("accountGroup.fields.status")}>
                {mode === "create" ? <ObjectStatus state="Positive">{t("common.active")}</ObjectStatus> : readOnly ? <ObjectStatus state={form.status === "ACTIVE" ? "Positive" : "None"}>{t("accountGroup.status." + form.status)}</ObjectStatus> : <Select
                  value={form.status}
                  disabled={!canChangeStatus || busy}
                  onChange={(event) => change("status", readValue(event) as CentralAccountGroupEditableStatus)}
                >
                  <Option value="ACTIVE">{t("accountGroup.status.ACTIVE")}</Option>
                  <Option value="INACTIVE">{t("accountGroup.status.INACTIVE")}</Option>
                </Select>}
              </Field>
              <Field label={t("accountGroup.fields.importance")} required>
                {readOnly ? <Text className="objectPageValue">{(t("accountGroup.importance." + form.importance)) || "—"}</Text> : <Select
                  value={form.importance}
                  disabled={readOnly || busy}
                  onChange={(event) => change("importance", readValue(event) as CentralAccountGroupImportance)}
                >
                  {CENTRAL_ACCOUNT_GROUP_IMPORTANCE.map((importance) => (
                    <Option key={importance} value={importance}>{t(`accountGroup.importance.${importance}`)}</Option>
                  ))}
                </Select>}
              </Field>
              <Field label={t("accountGroup.fields.reasonableAssurance")}>
                {readOnly ? <Text className="objectPageValue">{(t(form.reasonableAssurance ? "common.yes" : "common.no")) || "—"}</Text> : <Select
                  value={form.reasonableAssurance ? "true" : "false"}
                  disabled={readOnly || busy}
                  onChange={(event) => change("reasonableAssurance", readValue(event) === "true")}
                >
                  <Option value="true">{t("common.yes", { defaultValue: "بله" })}</Option>
                  <Option value="false">{t("common.no", { defaultValue: "خیر" })}</Option>
                </Select>}
              </Field>

              <div className="accountGroupDateRange">
                <Field label={t("accountGroup.fields.validFrom")}>
                  {readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validFrom)) || "—"}</Text> : <PersianDatePicker
                    value={form.validFrom}
                    readonly={readOnly}
                    disabled={busy}
                    accessibleName={t("accountGroup.fields.validFrom")}
                    invalidValueMessage={t("accountGroup.validation.invalidDate")}
                    onChange={(next) => change("validFrom", next)}
                    onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))}
                  />}
                </Field>
                <Field label={t("accountGroup.fields.validTo")}>
                  {readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validTo)) || "—"}</Text> : <PersianDatePicker
                    value={form.validTo}
                    readonly={readOnly}
                    disabled={busy}
                    accessibleName={t("accountGroup.fields.validTo")}
                    invalidValueMessage={t("accountGroup.validation.invalidDate")}
                    onChange={(next) => change("validTo", next)}
                    onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))}
                  />}
                </Field>
              </div>

              <Field label={t("accountGroup.fields.description")} fullWidth>
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

          <div className={activeTab === "controls" ? "accountGroupTabPanel" : "accountGroupTabPanel accountGroupTabPanelHidden"}>
            {value?.id && classificationPermissions.view ? <AccountGroupControlsTab accountGroupId={value.id} /> : null}
          </div>

          <div className={activeTab === "controlObjectives" ? "accountGroupTabPanel" : "accountGroupTabPanel accountGroupTabPanelHidden"}>
            {value?.id && objectiveClassificationPermissions.view ? (
              <AccountGroupControlObjectivesTab
                accountGroupId={value.id}
              />
            ) : null}
          </div>
        </div>

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
                {t("accountGroup.actions.submit")}
              </Button>
              <Button design="Transparent" disabled={busy} onClick={onCancel}>
                {t("common.cancel", { defaultValue: "انصراف" })}
              </Button>
            </>
          )}
        </DialogFooter>
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

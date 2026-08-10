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
  type DocumentAggregateRequest,
  type DocumentLinkTargetType,
  type ParentSaveDocumentDraftState,
} from "@/features/document";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import RegulationParentValueHelpDialog, {
  type RegulationParentCandidate,
} from "../components/RegulationParentValueHelpDialog";
import type {
  CentralRegulationAnyDetail,
  CentralRegulationNodeType,
} from "../domain/centralRegulation.model";

export type CentralRegulationObjectMode = "create" | "view" | "edit";
export type CentralRegulationTabKey = "general" | "documents";
export type CentralRegulationEditableStatus = "ACTIVE" | "INACTIVE";

export interface CentralRegulationObjectDraft {
  code: string;
  title: string;
  parentId: string | null;
  status: CentralRegulationEditableStatus;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: DocumentAggregateRequest;
  definitionDirty: boolean;
  documentsDirty: boolean;
}

interface FormState {
  code: string;
  title: string;
  parentId: string | null;
  status: CentralRegulationEditableStatus;
  description: string;
  validFrom: string;
  validTo: string;
}

interface Props {
  mode: CentralRegulationObjectMode;
  nodeType: CentralRegulationNodeType;
  value: CentralRegulationAnyDetail | null;
  initialParentId: string | null;
  parentCandidates: RegulationParentCandidate[];
  activeTab: CentralRegulationTabKey;
  busy: boolean;
  permissions: CatalogActionPermissions;
  error: string | null;
  documentError: DocumentAggregateDraftError | null;
  onErrorClose: () => void;
  onSubmit: (draft: CentralRegulationObjectDraft) => Promise<boolean>;
  onCancel: () => void;
  onEdit: () => void;
  onActiveTabChange: (tab: CentralRegulationTabKey) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const EMPTY_DATE_DRAFT: PersianDateDraftState = {
  draftValue: "",
  valid: true,
  dirty: false,
};

const documentTargetByType: Record<CentralRegulationNodeType, DocumentLinkTargetType> = {
  GROUP: "CENTRAL_REGULATION_GROUP",
  REGULATION: "CENTRAL_REGULATION",
  REQUIREMENT: "CENTRAL_REQUIREMENT",
};

function toForm(
  value: CentralRegulationAnyDetail | null,
  initialParentId: string | null,
): FormState {
  return {
    code: value?.code ?? "",
    title: value?.title ?? "",
    parentId: initialParentId,
    status: value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    description: value?.description ?? "",
    validFrom: value?.validFrom ?? "",
    validTo: value?.validTo ?? "",
  };
}

function normalized(form: FormState) {
  return {
    code: form.code.trim().toUpperCase(),
    title: form.title.trim(),
    parentId: form.parentId,
    status: form.status,
    description: form.description.trim(),
    validFrom: form.validFrom.trim(),
    validTo: form.validTo.trim(),
  };
}

function readValue(event: unknown) {
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
    <div className={fullWidth ? "regulationField regulationFieldWide" : "regulationField"}>
      <Label showColon required={required}>
        {label}
      </Label>
      {children}
    </div>
  );
}

export default function CentralRegulationObjectPage({
  mode,
  nodeType,
  value,
  initialParentId,
  parentCandidates,
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
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(normalized(toForm(value, initialParentId))),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(
    EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
  );
  const [dateDrafts, setDateDrafts] = useState({
    validFrom: EMPTY_DATE_DRAFT,
    validTo: EMPTY_DATE_DRAFT,
  });
  const scope = `${mode === "create" ? "CREATE" : value?.id ?? "EMPTY"}:${nodeType}:${mode}:${initialParentId ?? "ROOT"}`;
  const scopeRef = useRef(scope);
  const readOnly = mode === "view";
  const invalidDate = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const definitionDirty =
    JSON.stringify(normalized(form)) !== baseline ||
    dateDrafts.validFrom.dirty ||
    dateDrafts.validTo.dirty;
  const dirty = definitionDirty || documents.dirty || documents.uploading;
  const canChangeStatus = mode === "edit" && permissions.lifecycle;
  const canChangeParent = !readOnly && (mode === "create" || permissions.move);

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

  const selectedParent = useMemo(
    () =>
      form.parentId
        ? parentCandidates.find((candidate) => candidate.id === form.parentId) ?? null
        : null,
    [form.parentId, parentCandidates],
  );
  const parentLabel = selectedParent
    ? `${selectedParent.code} — ${selectedParent.title}`
    : t("regulation.parent.none");

  const change = <K extends keyof FormState>(key: K, next: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: next }));

  const validate = () => {
    if (!form.code.trim()) {
      setValidationError(t("regulation.validation.codeRequired"));
      return false;
    }
    if (!form.title.trim()) {
      setValidationError(t("regulation.validation.nameRequired"));
      return false;
    }
    if (nodeType !== "GROUP" && !form.parentId) {
      setValidationError(t("regulation.validation.parentRequired"));
      return false;
    }
    if (
      form.parentId &&
      !parentCandidates.some((candidate) => candidate.id === form.parentId)
    ) {
      setValidationError(t("regulation.errors.invalidParent"));
      return false;
    }
    if (invalidDate) {
      setValidationError(t("regulation.validation.invalidDate"));
      return false;
    }
    if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
      setValidationError(t("regulation.validation.invalidValidityRange"));
      return false;
    }
    if (!documents.ready || documents.invalid || documents.uploading) {
      setValidationError(t("regulation.validation.documentsNotReady"));
      onActiveTabChange("documents");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const submit = async () => {
    if (readOnly || !validate()) return;
    const draft: CentralRegulationObjectDraft = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      parentId: form.parentId,
      status: form.status,
      description: form.description.trim() || null,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      documents: toDocumentAggregateRequest(documents),
      definitionDirty,
      documentsDirty: documents.dirty,
    };
    if (await onSubmit(draft)) {
      setBaseline(JSON.stringify(normalized(form)));
      onDirtyChange(false);
    }
  };

  const typeKey =
    nodeType === "GROUP"
      ? "group"
      : nodeType === "REGULATION"
        ? "regulation"
        : "requirement";
  const saveDisabled =
    busy ||
    invalidDate ||
    documents.uploading ||
    documents.invalid ||
    !documents.ready ||
    (!definitionDirty && !documents.dirty);
  const headerValues = [
    [t("regulation.fields.code"), form.code || "-"],
    [t("regulation.fields.createdAt"), formatPersianDateTime(value?.createdAt)],
    [
      t("regulation.fields.validity"),
      `${formatPersianDate(form.validFrom)} - ${formatPersianDate(form.validTo)}`,
    ],
    [t("regulation.fields.status"), t(`regulation.status.${form.status}`)],
  ];

  return (
    <>
      <div className="regulationObjectPage">
        <div className="regulationObjectHeader">
          <Title level="H4">
            {form.title || t(`regulation.nodeType.${typeKey}`)}
          </Title>
          <div className="regulationHeaderGrid">
            {headerValues.map(([label, displayValue]) => (
              <div className="regulationHeaderItem" key={label}>
                <Label showColon>{label}</Label>
                <Input value={displayValue} readonly />
              </div>
            ))}
          </div>
        </div>

        <DetailTabContainer
          onTabSelect={(event) => {
            const key = event.detail.tab.getAttribute("data-tab-key") as CentralRegulationTabKey | null;
            if (key === "general" || key === "documents") onActiveTabChange(key);
          }}
        >
          <Tab
            text={t("regulation.tabs.general")}
            selected={activeTab === "general"}
            data-tab-key="general"
          />
          <Tab
            text={t("regulation.tabs.documents")}
            selected={activeTab === "documents"}
            data-tab-key="documents"
          />
        </DetailTabContainer>

        {error ? (
          <MessageStrip design="Negative" onClose={onErrorClose}>
            {error}
          </MessageStrip>
        ) : null}
        {validationError ? (
          <MessageStrip design="Negative" onClose={() => setValidationError(null)}>
            {validationError}
          </MessageStrip>
        ) : null}

        <div className="regulationObjectBody">
          <div
            className={
              activeTab === "general"
                ? "regulationTabPanel"
                : "regulationTabPanel regulationTabPanelHidden"
            }
          >
            <div className="regulationFormGrid">
              <Field label={t("regulation.fields.code")} required>
                <Input
                  value={form.code}
                  readonly={mode !== "create"}
                  disabled={busy}
                  maxlength={64}
                  onInput={(event) => change("code", readValue(event))}
                />
              </Field>
              <Field label={t("regulation.fields.name")} required>
                <Input
                  value={form.title}
                  readonly={readOnly}
                  disabled={busy}
                  maxlength={255}
                  onInput={(event) => change("title", readValue(event))}
                />
              </Field>
              <Field label={t("regulation.fields.type")}>
                <Input value={t(`regulation.nodeType.${typeKey}`)} readonly />
              </Field>
              <Field
                label={t("regulation.fields.parent")}
                required={nodeType !== "GROUP"}
              >
                <div className="regulationParentField">
                  <Input value={parentLabel} readonly />
                  {canChangeParent ? (
                    <Button disabled={busy} onClick={() => setParentDialogOpen(true)}>
                      {t("regulation.parent.select")}
                    </Button>
                  ) : null}
                </div>
              </Field>
              <Field label={t("regulation.fields.status")}>
                <Select
                  value={form.status}
                  disabled={!canChangeStatus || busy}
                  onChange={(event) =>
                    change(
                      "status",
                      readValue(event) === "INACTIVE" ? "INACTIVE" : "ACTIVE",
                    )
                  }
                >
                  <Option value="ACTIVE">{t("regulation.status.ACTIVE")}</Option>
                  <Option value="INACTIVE">{t("regulation.status.INACTIVE")}</Option>
                </Select>
              </Field>
              <div />
              <Field label={t("regulation.fields.validFrom")}>
                <PersianDatePicker
                  value={form.validFrom}
                  readonly={readOnly}
                  disabled={busy}
                  accessibleName={t("regulation.fields.validFrom")}
                  invalidValueMessage={t("regulation.validation.invalidDate")}
                  onChange={(next) => change("validFrom", next)}
                  onDraftStateChange={(next) =>
                    setDateDrafts((current) => ({ ...current, validFrom: next }))
                  }
                />
              </Field>
              <Field label={t("regulation.fields.validTo")}>
                <PersianDatePicker
                  value={form.validTo}
                  readonly={readOnly}
                  disabled={busy}
                  accessibleName={t("regulation.fields.validTo")}
                  invalidValueMessage={t("regulation.validation.invalidDate")}
                  onChange={(next) => change("validTo", next)}
                  onDraftStateChange={(next) =>
                    setDateDrafts((current) => ({ ...current, validTo: next }))
                  }
                />
              </Field>
              <Field label={t("regulation.fields.description")} fullWidth>
                <TextArea
                  rows={6}
                  value={form.description}
                  readonly={readOnly}
                  disabled={busy}
                  onInput={(event) => change("description", readValue(event))}
                />
              </Field>
            </div>
          </div>

          <div
            className={
              activeTab === "documents"
                ? "regulationTabPanel"
                : "regulationTabPanel regulationTabPanelHidden"
            }
          >
            <DocumentManager
              targetType={documentTargetByType[nodeType]}
              targetId={value?.id ?? null}
              readOnly={readOnly || !permissions.documentUpload}
              showActions={!readOnly && permissions.documentUpload}
              busy={busy}
              persistenceMode="PARENT_SAVE"
              aggregateError={documentError}
              onDraftStateChange={setDocuments}
              title={t("regulation.tabs.documents")}
            />
          </div>
        </div>

        <div className="regulationObjectFooter">
          {mode === "view" && permissions.update ? (
            <Button design="Emphasized" disabled={busy} onClick={onEdit}>
              {t("common.edit", { defaultValue: "ویرایش" })}
            </Button>
          ) : null}
          {mode !== "view" ? (
            <Button design="Emphasized" disabled={saveDisabled} onClick={() => void submit()}>
              {t("common.save", { defaultValue: "ذخیره" })}
            </Button>
          ) : null}
          <Button disabled={busy} onClick={onCancel}>
            {mode === "view"
              ? t("common.close", { defaultValue: "بستن" })
              : t("common.cancel", { defaultValue: "انصراف" })}
          </Button>
        </div>
      </div>

      <RegulationParentValueHelpDialog
        open={parentDialogOpen}
        candidates={parentCandidates}
        selectedParentId={form.parentId}
        allowNoParent={nodeType === "GROUP"}
        busy={busy}
        onClose={() => setParentDialogOpen(false)}
        onSelect={(parentId) => change("parentId", parentId)}
      />
    </>
  );
}

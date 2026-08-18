import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import {
  PersianDatePicker,
  type PersianDateDraftState,
} from "@/shared/components/PersianDatePicker";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import PolicyParentValueHelpDialog, {
  type PolicyParentCandidate,
} from "../components/PolicyParentValueHelpDialog";
import type {
  CentralPolicyAnyDetail,
  CentralPolicyCommunicationMethod,
  CentralPolicyDetail,
  CentralPolicyNodeType,
  CentralPolicyType,
} from "../domain/centralPolicy.model";

export type CentralPolicyObjectMode = "create" | "edit" | "view";
export type CentralPolicyTabKey =
  | "general"
  | "scope"
  | "controls"
  | "requirements"
  | "documents";

export interface CentralPolicyObjectDraft {
  code: string;
  title: string;
  parentId: string | null;
  status: "ACTIVE" | "INACTIVE";
  policyType: CentralPolicyType;
  responsibleOrganization: string | null;
  communicationMethod: CentralPolicyCommunicationMethod | null;
  nextReviewDate: string | null;
  objective: string | null;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
  documents: ReturnType<typeof toDocumentAggregateRequest>;
  documentsDirty: boolean;
}

interface Props {
  mode: CentralPolicyObjectMode;
  nodeType: CentralPolicyNodeType;
  value: CentralPolicyAnyDetail | null;
  initialParentId: string | null;
  parentCandidates: PolicyParentCandidate[];
  activeTab: CentralPolicyTabKey;
  busy: boolean;
  permissions: CatalogActionPermissions;
  error?: string | null;
  documentError?: DocumentAggregateDraftError | null;
  onErrorClose?: () => void;
  onSubmit: (draft: CentralPolicyObjectDraft) => Promise<boolean>;
  onCancel: () => void;
  onEdit: () => void;
  onActiveTabChange: (tab: CentralPolicyTabKey) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const EMPTY_DATE: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };

function FormField({ label, required = false, fullWidth = false, children }: {
  label: string;
  required?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={fullWidth ? "policyFormField policyFormFieldFull" : "policyFormField"}>
      <Label showColon required={required}>{label}</Label>
      {children}
    </div>
  );
}

function HeaderItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="policyHeaderItem">
      <strong>{label}:</strong>
      <span>{value?.trim() ? value : "-"}</span>
    </div>
  );
}

function readValue(event: unknown): string {
  return (event as { target?: { value?: string } }).target?.value ?? "";
}

function selectedValue(event: unknown): string {
  const selectedOption = (event as {
    detail?: { selectedOption?: { getAttribute?: (name: string) => string | null } };
  }).detail?.selectedOption;
  return selectedOption?.getAttribute?.("data-value") ?? readValue(event);
}

function policyTypeLabel(type: CentralPolicyType, t: ReturnType<typeof useTranslation>["t"]) {
  const labels: Record<CentralPolicyType, string> = {
    POLICY: t("policy.policyType.policy", { defaultValue: "سیاست" }),
    PROCEDURE: t("policy.policyType.procedure", { defaultValue: "دستورالعمل" }),
    ANNOUNCEMENT: t("policy.policyType.announcement", { defaultValue: "اطلاعیه" }),
    WORK_INSTRUCTION: t("policy.policyType.workInstruction", { defaultValue: "روش اجرایی" }),
  };
  return labels[type];
}

function communicationMethodLabel(
  method: CentralPolicyCommunicationMethod,
  t: ReturnType<typeof useTranslation>["t"],
) {
  const labels: Record<CentralPolicyCommunicationMethod, string> = {
    ANNOUNCEMENT: t("policy.communicationMethod.announcement", { defaultValue: "اطلاعیه" }),
    QUESTIONNAIRE: t("policy.communicationMethod.questionnaire", { defaultValue: "پرسشنامه" }),
    SURVEY: t("policy.communicationMethod.survey", { defaultValue: "نظرسنجی" }),
  };
  return labels[method];
}

export default function CentralPolicyObjectPage({
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
  const readOnly = mode === "view";
  const policyValue: CentralPolicyDetail | null =
    nodeType === "POLICY" && value && "policyType" in value ? value : null;
  const [code, setCode] = useState(value?.code ?? "");
  const [title, setTitle] = useState(value?.title ?? "");
  const [parentId, setParentId] = useState(initialParentId);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(
    value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  );
  const [policyType, setPolicyType] = useState<CentralPolicyType>(policyValue?.policyType ?? "POLICY");
  const [responsibleOrganization, setResponsibleOrganization] = useState(
    policyValue?.responsibleOrganization ?? "",
  );
  const [communicationMethod, setCommunicationMethod] = useState<CentralPolicyCommunicationMethod | "">(
    policyValue?.communicationMethod ?? "",
  );
  const [nextReviewDate, setNextReviewDate] = useState(policyValue?.nextReviewDate ?? "");
  const [objective, setObjective] = useState(policyValue?.objective ?? "");
  const [description, setDescription] = useState(value?.description ?? "");
  const [validFrom, setValidFrom] = useState(value?.validFrom ?? "");
  const [validTo, setValidTo] = useState(value?.validTo ?? "");
  const [dateDrafts, setDateDrafts] = useState({
    validFrom: EMPTY_DATE,
    validTo: EMPTY_DATE,
    nextReviewDate: EMPTY_DATE,
  });
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [documentDraft, setDocumentDraft] = useState<ParentSaveDocumentDraftState>(
    EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
  );

  const baseline = useMemo(
    () =>
      JSON.stringify({
        code: value?.code ?? "",
        title: value?.title ?? "",
        parentId: initialParentId,
        status: value?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        policyType: policyValue?.policyType ?? "POLICY",
        responsibleOrganization: policyValue?.responsibleOrganization ?? "",
        communicationMethod: policyValue?.communicationMethod ?? "",
        nextReviewDate: policyValue?.nextReviewDate ?? "",
        objective: policyValue?.objective ?? "",
        description: value?.description ?? "",
        validFrom: value?.validFrom ?? "",
        validTo: value?.validTo ?? "",
      }),
    [initialParentId, policyValue, value],
  );

  const invalidDate =
    !dateDrafts.validFrom.valid ||
    !dateDrafts.validTo.valid ||
    (nodeType === "POLICY" && !dateDrafts.nextReviewDate.valid);
  const generalDirty =
    JSON.stringify({
      code,
      title,
      parentId,
      status,
      policyType,
      responsibleOrganization,
      communicationMethod,
      nextReviewDate,
      objective,
      description,
      validFrom,
      validTo,
    }) !== baseline ||
    dateDrafts.validFrom.dirty ||
    dateDrafts.validTo.dirty ||
    (nodeType === "POLICY" && dateDrafts.nextReviewDate.dirty);
  const documentsBusy = documentDraft.uploading;
  const documentsInvalid = !documentDraft.ready || documentDraft.invalid || documentDraft.uploading;
  const dirty = generalDirty || documentDraft.dirty || documentDraft.uploading;
  const canChangeStatus = mode === "edit" && permissions.lifecycle;
  const canChangeParent = !readOnly && (mode === "create" || permissions.move);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const parent = parentId ? parentCandidates.find((item) => item.id === parentId) : null;
  const parentLabel = parent
    ? `${parent.code} — ${parent.title}`
    : t("policy.parent.none", { defaultValue: "بدون والد" });
  const nodeTypeLabel = nodeType === "GROUP"
    ? t("policy.nodeType.group", { defaultValue: "گروه سیاست" })
    : t("policy.nodeType.policy", { defaultValue: "سیاست" });
  const statusLabel = status === "ACTIVE"
    ? t("common.active", { defaultValue: "فعال" })
    : t("common.inactive", { defaultValue: "غیرفعال" });

  const validate = () => {
    if (!code.trim()) {
      setValidationError(t("policy.validation.codeRequired", { defaultValue: "شناسه الزامی است." }));
      return false;
    }
    if (!title.trim()) {
      setValidationError(t("policy.validation.titleRequired", { defaultValue: "نام الزامی است." }));
      return false;
    }
    if (nodeType === "POLICY" && !parentId) {
      setValidationError(t("policy.validation.groupRequired", { defaultValue: "گروه سیاست الزامی است." }));
      return false;
    }
    if (parentId && !parentCandidates.some((candidate) => candidate.id === parentId)) {
      setValidationError(t("policy.errors.invalidParent", { defaultValue: "والد انتخاب‌شده معتبر نیست." }));
      return false;
    }
    if (invalidDate) {
      setValidationError(t("common.invalidPersianDate", { defaultValue: "تاریخ نامعتبر است." }));
      return false;
    }
    if (validFrom && validTo && validFrom > validTo) {
      setValidationError(t("policy.validation.invalidValidityRange", { defaultValue: "بازه اعتبار نامعتبر است." }));
      return false;
    }
    if (documentsInvalid) {
      setValidationError(t("document.errors.finalize", { defaultValue: "مستندات برای ذخیره آماده نیستند." }));
      onActiveTabChange("documents");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const submit = async () => {
    if (readOnly || !validate()) return;
    await onSubmit({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      parentId,
      status,
      policyType,
      responsibleOrganization: nodeType === "POLICY" ? responsibleOrganization.trim() || null : null,
      communicationMethod: nodeType === "POLICY" && communicationMethod ? communicationMethod : null,
      nextReviewDate: nodeType === "POLICY" ? nextReviewDate || null : null,
      objective: nodeType === "POLICY" ? objective.trim() || null : null,
      description: description.trim() || null,
      validFrom: validFrom || null,
      validTo: validTo || null,
      documents: toDocumentAggregateRequest(documentDraft),
      documentsDirty: documentDraft.dirty,
    });
  };

  const tabs: Array<{ key: CentralPolicyTabKey; label: string; disabled?: boolean }> =
    nodeType === "GROUP"
      ? [
          { key: "general", label: t("policy.tabs.general", { defaultValue: "اطلاعات کلی" }) },
          { key: "documents", label: t("policy.tabs.documents", { defaultValue: "مستندات" }) },
        ]
      : [
          { key: "general", label: t("policy.tabs.general", { defaultValue: "اطلاعات کلی" }) },
          { key: "scope", label: t("policy.tabs.scope", { defaultValue: "دامنه سیاست" }), disabled: true },
          { key: "controls", label: t("policy.tabs.controls", { defaultValue: "کنترل‌ها" }), disabled: true },
          { key: "requirements", label: t("policy.tabs.requirements", { defaultValue: "الزامات" }), disabled: true },
          { key: "documents", label: t("policy.tabs.documents", { defaultValue: "مستندات" }) },
        ];
  const saveDisabled =
    busy ||
    invalidDate ||
    documentsBusy ||
    documentsInvalid ||
    (mode === "edit" && !generalDirty && !documentDraft.dirty);

  return (
    <div className="policyObjectPage">
      <div className="policyObjectHeader">
        <div className="policyObjectHeaderTitle">
          <Title level="H4">{mode === "create" ? nodeTypeLabel : title || nodeTypeLabel}</Title>
        </div>
        <div className="policyObjectHeaderGrid">
          <HeaderItem label={t("policy.fields.name", { defaultValue: "نام" })} value={title} />
          <HeaderItem label={t("policy.fields.identifier", { defaultValue: "شناسه" })} value={code} />
          <HeaderItem label={t("policy.fields.parent", { defaultValue: "والد" })} value={parentLabel} />
          <HeaderItem label={t("policy.fields.status", { defaultValue: "وضعیت" })} value={statusLabel} />
          {nodeType === "POLICY" ? (
            <HeaderItem
              label={t("policy.fields.policyType", { defaultValue: "نوع سیاست" })}
              value={policyTypeLabel(policyType, t)}
            />
          ) : null}
          <HeaderItem
            label={t("policy.fields.validity", { defaultValue: "بازه اعتبار" })}
            value={`${formatPersianDate(validFrom)} - ${formatPersianDate(validTo)}`}
          />
          <HeaderItem
            label={t("policy.fields.createdAt", { defaultValue: "تاریخ ایجاد" })}
            value={formatPersianDateTime(value?.createdAt)}
          />
          <HeaderItem
            label={t("policy.fields.updatedAt", { defaultValue: "تاریخ بروزرسانی" })}
            value={formatPersianDateTime(value?.updatedAt)}
          />
        </div>
      </div>

      <DetailTabContainer
        onTabSelect={(event) => {
          const key = event.detail.tab.getAttribute("data-tab-key") as CentralPolicyTabKey | null;
          if (key) onActiveTabChange(key);
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            text={tab.label}
            disabled={tab.disabled}
            selected={activeTab === tab.key}
            data-tab-key={tab.key}
          />
        ))}
      </DetailTabContainer>

      {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
      {validationError ? (
        <MessageStrip design="Negative" onClose={() => setValidationError(null)}>
          {validationError}
        </MessageStrip>
      ) : null}

      <div className="policyObjectBody">
        <div style={{ display: activeTab === "general" ? "block" : "none" }}>
          <div className="policyFormGrid">
            <FormField label={t("policy.fields.identifier", { defaultValue: "شناسه" })} required>
              <Input
                value={code}
                readonly={mode !== "create"}
                disabled={busy}
                maxlength={64}
                onInput={(event) => setCode(readValue(event))}
              />
            </FormField>
            <FormField label={t("policy.fields.name", { defaultValue: "نام" })} required>
              <Input
                value={title}
                readonly={readOnly}
                disabled={busy}
                maxlength={255}
                onInput={(event) => setTitle(readValue(event))}
              />
            </FormField>
            <FormField label={t("policy.fields.parent", { defaultValue: "والد" })} required={nodeType === "POLICY"}>
              <div className="policyParentField">
                <Input value={parentLabel} readonly />
                {canChangeParent ? (
                  <Button disabled={busy} onClick={() => setParentDialogOpen(true)}>
                    {t("common.select", { defaultValue: "انتخاب" })}
                  </Button>
                ) : null}
              </div>
            </FormField>
            <FormField label={t("policy.fields.status", { defaultValue: "وضعیت" })}>
              <Select
                value={status}
                disabled={!canChangeStatus || busy}
                onChange={(event) => setStatus(selectedValue(event) as "ACTIVE" | "INACTIVE")}
              >
                <Option data-value="ACTIVE" value="ACTIVE">{t("common.active", { defaultValue: "فعال" })}</Option>
                <Option data-value="INACTIVE" value="INACTIVE">{t("common.inactive", { defaultValue: "غیرفعال" })}</Option>
              </Select>
            </FormField>

            {nodeType === "POLICY" ? (
              <>
                <FormField label={t("policy.fields.policyType", { defaultValue: "نوع سیاست" })} required>
                  <Select
                    value={policyType}
                    disabled={readOnly || busy}
                    onChange={(event) => setPolicyType(selectedValue(event) as CentralPolicyType)}
                  >
                    {(["POLICY", "PROCEDURE", "ANNOUNCEMENT", "WORK_INSTRUCTION"] as CentralPolicyType[]).map((type) => (
                      <Option key={type} data-value={type} value={type}>{policyTypeLabel(type, t)}</Option>
                    ))}
                  </Select>
                </FormField>
                <FormField label={t("policy.fields.responsibleOrganization", { defaultValue: "سازمان مسئول" })}>
                  <Input
                    value={responsibleOrganization}
                    readonly={readOnly}
                    disabled={busy}
                    maxlength={255}
                    onInput={(event) => setResponsibleOrganization(readValue(event))}
                  />
                </FormField>
                <FormField label={t("policy.fields.communicationMethods", { defaultValue: "روش‌های اطلاع‌رسانی" })}>
                  <Select
                    value={communicationMethod}
                    disabled={readOnly || busy}
                    onChange={(event) =>
                      setCommunicationMethod(selectedValue(event) as CentralPolicyCommunicationMethod | "")
                    }
                  >
                    <Option data-value="" value="">{t("common.none", { defaultValue: "ندارد" })}</Option>
                    {(["ANNOUNCEMENT", "QUESTIONNAIRE", "SURVEY"] as CentralPolicyCommunicationMethod[]).map((method) => (
                      <Option key={method} data-value={method} value={method}>
                        {communicationMethodLabel(method, t)}
                      </Option>
                    ))}
                  </Select>
                </FormField>
                <FormField label={t("policy.fields.nextReviewDate", { defaultValue: "تاریخ بازنگری بعدی" })}>
                  <PersianDatePicker
                    value={nextReviewDate}
                    readonly={readOnly}
                    disabled={busy}
                    accessibleName={t("policy.fields.nextReviewDate", { defaultValue: "تاریخ بازنگری بعدی" })}
                    invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "تاریخ نامعتبر است" })}
                    onChange={setNextReviewDate}
                    onDraftStateChange={(next) =>
                      setDateDrafts((current) => ({ ...current, nextReviewDate: next }))
                    }
                  />
                </FormField>
              </>
            ) : null}

            <div className="policyDateRange">
              <FormField label={t("policy.fields.validFrom", { defaultValue: "تاریخ اعتبار از" })}>
                <PersianDatePicker
                  value={validFrom}
                  readonly={readOnly}
                  disabled={busy}
                  accessibleName={t("policy.fields.validFrom", { defaultValue: "تاریخ اعتبار از" })}
                  invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "تاریخ نامعتبر است" })}
                  onChange={setValidFrom}
                  onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))}
                />
              </FormField>
              <FormField label={t("policy.fields.validTo", { defaultValue: "تاریخ اعتبار تا" })}>
                <PersianDatePicker
                  value={validTo}
                  readonly={readOnly}
                  disabled={busy}
                  accessibleName={t("policy.fields.validTo", { defaultValue: "تاریخ اعتبار تا" })}
                  invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "تاریخ نامعتبر است" })}
                  onChange={setValidTo}
                  onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))}
                />
              </FormField>
            </div>

            {nodeType === "POLICY" ? (
              <FormField label={t("policy.fields.objective", { defaultValue: "هدف" })} fullWidth>
                <TextArea
                  rows={3}
                  value={objective}
                  readonly={readOnly}
                  disabled={busy}
                  onInput={(event) => setObjective(readValue(event))}
                />
              </FormField>
            ) : null}

            <FormField label={t("policy.fields.description", { defaultValue: "شرح" })} fullWidth>
              <TextArea
                rows={5}
                value={description}
                readonly={readOnly}
                disabled={busy}
                onInput={(event) => setDescription(readValue(event))}
              />
            </FormField>
          </div>
        </div>

        <div style={{ display: activeTab === "documents" ? "block" : "none" }}>
          <DocumentManager
            targetType={nodeType === "GROUP" ? "CENTRAL_POLICY_GROUP" : "CENTRAL_POLICY"}
            targetId={value?.id ?? null}
            readOnly={readOnly || !permissions.documentUpload}
            showActions={!readOnly && permissions.documentUpload}
            busy={busy}
            persistenceMode="PARENT_SAVE"
            aggregateError={documentError}
            onDraftStateChange={setDocumentDraft}
            title={t("policy.tabs.documents", { defaultValue: "مستندات" })}
          />
        </div>
      </div>

      <div className="policyObjectFooter">
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
        <Button design="Transparent" disabled={busy} onClick={onCancel}>
          {mode === "view"
            ? t("common.close", { defaultValue: "بستن" })
            : t("common.cancel", { defaultValue: "انصراف" })}
        </Button>
      </div>

      <PolicyParentValueHelpDialog
        open={parentDialogOpen}
        candidates={parentCandidates}
        selectedParentId={parentId}
        allowNoParent={nodeType === "GROUP"}
        busy={busy}
        onClose={() => setParentDialogOpen(false)}
        onSelect={setParentId}
      />
    </div>
  );
}

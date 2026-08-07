import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Label,
  MessageStrip,
  TextArea,
  Title,
} from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import {
  DocumentManager,
  EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
  type DocumentAggregateDraftError,
  type ParentSaveDocumentDraftState,
} from "@/features/document";
import {
  PersianDatePicker,
  type PersianDateDraftState,
} from "@/shared/components/PersianDatePicker";
import type {
  DefinitionDetailFields,
  DefinitionDraft,
  DefinitionPresentationOptions,
} from "./catalogPresentation.model";
import type { CatalogActionPermissions } from "../security/catalogPermissions";

const EMPTY_DATE_DRAFT: PersianDateDraftState = {
  draftValue: "",
  valid: true,
  dirty: false,
};

interface Props<T extends DefinitionDetailFields> {
  options: DefinitionPresentationOptions;
  value: T | null;
  creating: boolean;
  editing: boolean;
  busy: boolean;
  error: string | null;
  documentError: DocumentAggregateDraftError | null;
  permissions: CatalogActionPermissions;
  onDirtyChange: (dirty: boolean) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (
    draft: DefinitionDraft,
    documents: ParentSaveDocumentDraftState,
  ) => Promise<void>;
  onLifecycle: (action: "activate" | "inactivate" | "delete") => void;
  children?: React.ReactNode;
}

function toDraft(value: DefinitionDetailFields | null): DefinitionDraft {
  return {
    code: value?.code ?? "",
    title: value?.title ?? "",
    description: value?.description ?? "",
    validFrom: value?.validFrom ?? "",
    validTo: value?.validTo ?? "",
  };
}

function readValue(event: unknown): string {
  return (event as { target?: { value?: string } }).target?.value ?? "";
}

export function DefinitionObjectPage<T extends DefinitionDetailFields>({
  options,
  value,
  creating,
  editing,
  busy,
  error,
  documentError,
  permissions,
  onDirtyChange,
  onEdit,
  onCancel,
  onSave,
  onLifecycle,
  children,
}: Props<T>) {
  const { t } = useTranslation();
  const baseline = useMemo(() => toDraft(value), [value]);
  const [draft, setDraft] = useState<DefinitionDraft>(baseline);
  const [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(
    EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
  );
  const [dateDrafts, setDateDrafts] = useState({
    validFrom: EMPTY_DATE_DRAFT,
    validTo: EMPTY_DATE_DRAFT,
  });
  const dateInvalid = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(baseline) ||
    documents.dirty ||
    dateDrafts.validFrom.dirty ||
    dateDrafts.validTo.dirty;

  useEffect(() => {
    const resetHandle = window.setTimeout(() => {
      setDraft(baseline);
      setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
      setDateDrafts({ validFrom: EMPTY_DATE_DRAFT, validTo: EMPTY_DATE_DRAFT });
    }, 0);
    return () => window.clearTimeout(resetHandle);
  }, [baseline]);
  useEffect(
    () => onDirtyChange(dirty || documents.uploading),
    [dirty, documents.uploading, onDirtyChange],
  );

  const change = (field: keyof DefinitionDraft, next: string) =>
    setDraft((current) => ({ ...current, [field]: next }));
  const readOnly = !editing;
  const canSave =
    dirty &&
    !dateInvalid &&
    documents.ready &&
    !documents.invalid &&
    !documents.uploading;

  return (
    <section className="catalogObjectPage">
      <header className="catalogToolbar">
        <Title level="H4">{options.title}</Title>
        <span className="catalogToolbarActions">
          {!editing && value && permissions.update && (
            <Button design="Emphasized" onClick={onEdit}>
              {t("common.edit", { defaultValue: "ویرایش" })}
            </Button>
          )}
          {editing && (
            <Button
              design="Emphasized"
              disabled={busy || !canSave}
              onClick={() => void onSave(draft, documents)}
            >
              {t("common.save", { defaultValue: "ذخیره" })}
            </Button>
          )}
          {editing && (
            <Button disabled={busy} onClick={onCancel}>
              {t("common.cancel", { defaultValue: "انصراف" })}
            </Button>
          )}
          {!editing && value?.status === "ACTIVE" && permissions.lifecycle && (
            <Button disabled={busy} onClick={() => onLifecycle("inactivate")}>
              {t("common.inactivate", { defaultValue: "غیرفعال" })}
            </Button>
          )}
          {!editing &&
            value?.status === "INACTIVE" &&
            permissions.lifecycle && (
              <Button disabled={busy} onClick={() => onLifecycle("activate")}>
                {t("common.activate", { defaultValue: "فعال" })}
              </Button>
            )}
          {!editing && value && permissions.delete && (
            <Button
              design="Negative"
              disabled={busy}
              onClick={() => onLifecycle("delete")}
            >
              {t("common.delete", { defaultValue: "حذف" })}
            </Button>
          )}
        </span>
      </header>
      {error && (
        <MessageStrip design="Negative" hideCloseButton>
          {error}
        </MessageStrip>
      )}
      <div className="catalogFormGrid">
        <Label>
          {t("common.code", { defaultValue: "کد" })}
          <Input
            value={draft.code}
            readonly={!creating}
            disabled={busy}
            onInput={(event) => change("code", readValue(event))}
          />
        </Label>
        <Label>
          {t("common.title", { defaultValue: "عنوان" })}
          <Input
            value={draft.title}
            readonly={readOnly}
            disabled={busy}
            onInput={(event) => change("title", readValue(event))}
          />
        </Label>
        <Label>
          {t("centralCatalog.validFrom", { defaultValue: "اعتبار از" })}
          <PersianDatePicker
            value={draft.validFrom}
            readonly={readOnly}
            disabled={busy}
            accessibleName={t("centralCatalog.validFrom", {
              defaultValue: "اعتبار از",
            })}
            invalidValueMessage={t("common.invalidPersianDate", {
              defaultValue: "تاریخ نامعتبر است",
            })}
            onChange={(next) => change("validFrom", next)}
            onDraftStateChange={(next) =>
              setDateDrafts((current) => ({ ...current, validFrom: next }))
            }
          />
        </Label>
        <Label>
          {t("centralCatalog.validTo", { defaultValue: "اعتبار تا" })}
          <PersianDatePicker
            value={draft.validTo}
            readonly={readOnly}
            disabled={busy}
            accessibleName={t("centralCatalog.validTo", {
              defaultValue: "اعتبار تا",
            })}
            invalidValueMessage={t("common.invalidPersianDate", {
              defaultValue: "تاریخ نامعتبر است",
            })}
            onChange={(next) => change("validTo", next)}
            onDraftStateChange={(next) =>
              setDateDrafts((current) => ({ ...current, validTo: next }))
            }
          />
        </Label>
        <Label className="catalogWideField">
          {t("common.description", { defaultValue: "شرح" })}
          <TextArea
            rows={5}
            value={draft.description}
            readonly={readOnly}
            disabled={busy}
            onInput={(event) => change("description", readValue(event))}
          />
        </Label>
      </div>
      {children}
      <DocumentManager
        targetType={options.documentTarget}
        targetId={value?.id ?? null}
        readOnly={readOnly || !permissions.documentUpload}
        showActions={editing && permissions.documentUpload}
        busy={busy}
        persistenceMode="PARENT_SAVE"
        aggregateError={documentError}
        onDraftStateChange={setDocuments}
        title={t("centralCatalog.documents", { defaultValue: "اسناد" })}
      />
    </section>
  );
}

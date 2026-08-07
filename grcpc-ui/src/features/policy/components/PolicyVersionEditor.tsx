import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Label,
  MessageStrip,
  TextArea,
  Title,
} from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import type { CatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import {
  DocumentManager,
  EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
  toDocumentAggregateDraftError,
  toDocumentAggregateRequest,
  type DocumentAggregateDraftError,
  type ParentSaveDocumentDraftState,
} from "@/features/document";
import {
  PersianDatePicker,
  type PersianDateDraftState,
} from "@/shared/components/PersianDatePicker";
import type { CentralPolicyVersionDetail } from "../domain/centralPolicy.model";
import { centralPolicyApi } from "../infra/centralPolicy.api";
const EMPTY_DATE: PersianDateDraftState = {
  draftValue: "",
  valid: true,
  dirty: false,
};
export function PolicyVersionEditor({
  policyId,
  busy: parentBusy,
  onDirtyChange,
  permissions,
}: {
  policyId: string;
  busy: boolean;
  onDirtyChange: (dirty: boolean) => void;
  permissions: CatalogActionPermissions;
}) {
  const { t } = useTranslation(),
    generation = useRef(0);
  const [versions, setVersions] = useState<CentralPolicyVersionDetail[]>([]),
    [selected, setSelected] = useState<CentralPolicyVersionDetail | null>(null),
    [creating, setCreating] = useState(false),
    [editing, setEditing] = useState(false),
    [deletedMode, setDeletedMode] = useState(false),
    [content, setContent] = useState(""),
    [validFrom, setValidFrom] = useState(""),
    [validTo, setValidTo] = useState(""),
    [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(
      EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
    ),
    [dateDrafts, setDateDrafts] = useState({
      validFrom: EMPTY_DATE,
      validTo: EMPTY_DATE,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [documentError, setDocumentError] =
      useState<DocumentAggregateDraftError | null>(null);
  const baseline = useMemo(
    () => ({
      content: selected?.content ?? "",
      validFrom: selected?.validFrom ?? "",
      validTo: selected?.validTo ?? "",
    }),
    [selected],
  );
  const dirty =
    content !== baseline.content ||
    validFrom !== baseline.validFrom ||
    validTo !== baseline.validTo ||
    documents.dirty ||
    documents.uploading ||
    dateDrafts.validFrom.dirty ||
    dateDrafts.validTo.dirty;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const load = useCallback(
    async (keepId?: string) => {
      const request = ++generation.current;
      setBusy(true);
      try {
        const rows = await centralPolicyApi.listVersions(policyId, deletedMode);
        if (request !== generation.current) return;
        setVersions(rows);
        const next = rows.find((row) => row.id === keepId) ?? rows[0] ?? null;
        setSelected(next);
        setContent(next?.content ?? "");
        setValidFrom(next?.validFrom ?? "");
        setValidTo(next?.validTo ?? "");
        setCreating(false);
        setEditing(false);
        setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
        setDateDrafts({ validFrom: EMPTY_DATE, validTo: EMPTY_DATE });
      } catch (cause) {
        if (request === generation.current)
          setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (request === generation.current) setBusy(false);
      }
    },
    [deletedMode, policyId],
  );
  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, [load]);
  const confirmLeave = () =>
    !dirty ||
    window.confirm(
      t("centralCatalog.discard", {
        defaultValue: "تغییرات ذخیره‌نشده نادیده گرفته شود؟",
      }),
    );
  const select = (version: CentralPolicyVersionDetail) => {
    if (!confirmLeave()) return;
    generation.current += 1;
    setSelected(version);
    setContent(version.content ?? "");
    setValidFrom(version.validFrom ?? "");
    setValidTo(version.validTo ?? "");
    setCreating(false);
    setEditing(false);
    setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
    setDateDrafts({ validFrom: EMPTY_DATE, validTo: EMPTY_DATE });
  };
  const save = async () => {
    if (
      !documents.ready ||
      documents.invalid ||
      documents.uploading ||
      !dateDrafts.validFrom.valid ||
      !dateDrafts.validTo.valid
    )
      return;
    setBusy(true);
    setError(null);
    setDocumentError(null);
    generation.current += 1;
    try {
      const common = {
        content: content.trim() || null,
        validFrom: validFrom || null,
        validTo: validTo || null,
        documents: toDocumentAggregateRequest(documents),
      };
      const result = creating
        ? await centralPolicyApi.createVersion(policyId, common)
        : await centralPolicyApi.updateVersion(selected!.id, {
            ...common,
            version: selected!.version,
          });
      await load(result.entityId);
    } catch (cause) {
      setDocumentError(toDocumentAggregateDraftError(cause));
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    if (!selected || !confirmLeave()) return;
    setBusy(true);
    generation.current += 1;
    try {
      await centralPolicyApi.publishVersion(selected.id, selected.version);
      await load(selected.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const lifecycle = async (action: "delete" | "restore") => {
    if (!selected || !confirmLeave()) return;
    setBusy(true);
    generation.current += 1;
    try {
      await centralPolicyApi.versionLifecycle(
        selected.id,
        action,
        selected.version,
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const immutable =
    deletedMode || (!creating && selected?.versionStatus !== "DRAFT");
  const blocked = busy || parentBusy;
  const canEditDraft = creating ? permissions.create : permissions.update;
  return (
    <section className="policyVersionEditor">
      <header className="catalogToolbar">
        <Title level="H4">
          {t("centralCatalog.policyVersions", {
            defaultValue: "نسخه‌های خط‌مشی",
          })}
        </Title>
        <span className="catalogToolbarActions">
          <Button
            design="Emphasized"
            hidden={!permissions.create}
            disabled={blocked || deletedMode}
            onClick={() => {
              if (!confirmLeave()) return;
              setCreating(true);
              setEditing(true);
              setSelected(null);
              setContent("");
              setValidFrom("");
              setValidTo("");
              setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
            }}
          >
            {t("centralCatalog.newDraft", { defaultValue: "پیش‌نویس جدید" })}
          </Button>
          <Button
            disabled={blocked || dirty}
            onClick={() => setDeletedMode((value) => !value)}
          >
            {deletedMode
              ? t("common.back", { defaultValue: "بازگشت" })
              : t("centralCatalog.deleted", { defaultValue: "حذف‌شده‌ها" })}
          </Button>
        </span>
      </header>
      {error && (
        <MessageStrip design="Negative" hideCloseButton>
          {error}
        </MessageStrip>
      )}
      <div className="policyVersionList">
        {versions.map((version) => (
          <Button
            key={version.id}
            design={selected?.id === version.id ? "Emphasized" : "Transparent"}
            disabled={blocked}
            onClick={() => select(version)}
          >
            v{version.versionNumber} — {version.versionStatus}
          </Button>
        ))}
      </div>
      {(creating || selected) && (
        <div className="catalogObjectPage">
          <div className="catalogToolbarActions">
            {!immutable && !editing && permissions.update && (
              <Button onClick={() => setEditing(true)}>
                {t("common.edit", { defaultValue: "ویرایش" })}
              </Button>
            )}
            {editing && !immutable && canEditDraft && (
              <Button
                design="Emphasized"
                disabled={blocked || !dirty}
                onClick={() => void save()}
              >
                {t("common.save", { defaultValue: "ذخیره" })}
              </Button>
            )}
            {selected && !immutable && !editing && permissions.publish && (
              <Button
                design="Emphasized"
                disabled={blocked || !selected.content?.trim()}
                onClick={() => void publish()}
              >
                {t("centralCatalog.publish", { defaultValue: "انتشار" })}
              </Button>
            )}
            {selected && !immutable && !editing && permissions.delete && (
              <Button
                design="Negative"
                disabled={blocked}
                onClick={() => void lifecycle("delete")}
              >
                {t("common.delete", { defaultValue: "حذف" })}
              </Button>
            )}
            {selected && deletedMode && permissions.restore && (
              <Button
                disabled={blocked}
                onClick={() => void lifecycle("restore")}
              >
                {t("common.restore", { defaultValue: "بازیابی" })}
              </Button>
            )}
          </div>
          <TextArea
            rows={10}
            value={content}
            readonly={!editing || immutable}
            disabled={blocked}
            onInput={(event) => setContent(event.target.value)}
          />
          <div className="catalogFormGrid">
            <Label>
              {t("centralCatalog.validFrom", { defaultValue: "اعتبار از" })}
              <PersianDatePicker
                value={validFrom}
                readonly={!editing || immutable}
                disabled={blocked}
                accessibleName={t("centralCatalog.validFrom", {
                  defaultValue: "اعتبار از",
                })}
                invalidValueMessage={t("common.invalidPersianDate", {
                  defaultValue: "تاریخ نامعتبر است",
                })}
                onChange={setValidFrom}
                onDraftStateChange={(next) =>
                  setDateDrafts((current) => ({ ...current, validFrom: next }))
                }
              />
            </Label>
            <Label>
              {t("centralCatalog.validTo", { defaultValue: "اعتبار تا" })}
              <PersianDatePicker
                value={validTo}
                readonly={!editing || immutable}
                disabled={blocked}
                accessibleName={t("centralCatalog.validTo", {
                  defaultValue: "اعتبار تا",
                })}
                invalidValueMessage={t("common.invalidPersianDate", {
                  defaultValue: "تاریخ نامعتبر است",
                })}
                onChange={setValidTo}
                onDraftStateChange={(next) =>
                  setDateDrafts((current) => ({ ...current, validTo: next }))
                }
              />
            </Label>
          </div>
          <DocumentManager
            targetType="CENTRAL_POLICY_VERSION"
            targetId={selected?.id ?? null}
            readOnly={
              !editing ||
              immutable ||
              !canEditDraft ||
              !permissions.documentUpload
            }
            showActions={
              editing &&
              !immutable &&
              canEditDraft &&
              permissions.documentUpload
            }
            busy={blocked}
            persistenceMode="PARENT_SAVE"
            aggregateError={documentError}
            onDraftStateChange={(draft) => {
              setDocuments(draft);
              setDocumentError(null);
            }}
            title={t("centralCatalog.versionDocuments", {
              defaultValue: "اسناد نسخه",
            })}
          />
        </div>
      )}
    </section>
  );
}

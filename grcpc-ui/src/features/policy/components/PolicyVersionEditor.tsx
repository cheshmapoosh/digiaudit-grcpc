import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Label, MessageStrip, TextArea, Title } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";

import type { CatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import {
  EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE,
  toDocumentAggregateRequest,
} from "@/features/document";
import {
  PersianDatePicker,
  type PersianDateDraftState,
} from "@/shared/components/PersianDatePicker";
import type { CentralPolicyVersionDetail, PolicyVersionStatus } from "../domain/centralPolicy.model";
import { centralPolicyApi } from "../infra/centralPolicy.api";

const EMPTY_DATE: PersianDateDraftState = { draftValue: "", valid: true, dirty: false };

function versionStatusLabel(status: PolicyVersionStatus, t: ReturnType<typeof useTranslation>["t"]) {
  if (status === "DRAFT") return t("policy.versionStatus.draft", { defaultValue: "پیش‌نویس" });
  if (status === "PUBLISHED") return t("policy.versionStatus.published", { defaultValue: "منتشرشده" });
  return t("policy.versionStatus.superseded", { defaultValue: "منسوخ‌شده" });
}

export function PolicyVersionEditor({
  policyId,
  busy: parentBusy,
  readOnly,
  onDirtyChange,
  onSelectedVersionChange,
  permissions,
}: {
  policyId: string;
  busy: boolean;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSelectedVersionChange?: (version: CentralPolicyVersionDetail | null) => void;
  permissions: CatalogActionPermissions;
}) {
  const { t } = useTranslation();
  const generation = useRef(0);
  const [versions, setVersions] = useState<CentralPolicyVersionDetail[]>([]);
  const [selected, setSelected] = useState<CentralPolicyVersionDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [dateDrafts, setDateDrafts] = useState({ validFrom: EMPTY_DATE, validTo: EMPTY_DATE });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    dateDrafts.validFrom.dirty ||
    dateDrafts.validTo.dirty;

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => onSelectedVersionChange?.(selected), [onSelectedVersionChange, selected]);

  const applySelection = useCallback((next: CentralPolicyVersionDetail | null) => {
    setSelected(next);
    setContent(next?.content ?? "");
    setValidFrom(next?.validFrom ?? "");
    setValidTo(next?.validTo ?? "");
    setCreating(false);
    setEditing(false);
    setDateDrafts({ validFrom: EMPTY_DATE, validTo: EMPTY_DATE });
  }, []);

  const load = useCallback(
    async (keepId?: string) => {
      const request = ++generation.current;
      setBusy(true);
      try {
        const rows = await centralPolicyApi.listVersions(policyId);
        if (request !== generation.current) return;
        setVersions(rows);
        applySelection(rows.find((row) => row.id === keepId) ?? rows[0] ?? null);
        setError(null);
      } catch (cause) {
        if (request === generation.current) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      } finally {
        if (request === generation.current) setBusy(false);
      }
    },
    [applySelection, policyId],
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
      t("centralCatalog.discard", { defaultValue: "تغییرات ذخیره‌نشده نادیده گرفته شود؟" }),
    );

  const select = (version: CentralPolicyVersionDetail) => {
    if (!confirmLeave()) return;
    generation.current += 1;
    applySelection(version);
  };

  const save = async () => {
    if (readOnly || !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid) return;
    if (validFrom && validTo && validFrom > validTo) {
      setError(t("policy.validation.invalidValidityRange", { defaultValue: "بازه اعتبار نامعتبر است." }));
      return;
    }
    setBusy(true);
    setError(null);
    generation.current += 1;
    try {
      const common = {
        content: content.trim() || null,
        validFrom: validFrom || null,
        validTo: validTo || null,
        documents: toDocumentAggregateRequest(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE),
      };
      const result = creating
        ? await centralPolicyApi.createVersion(policyId, common)
        : await centralPolicyApi.updateVersion(selected!.id, {
            ...common,
            version: selected!.version,
          });
      await load(result.entityId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (readOnly || !selected || !confirmLeave()) return;
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

  const immutable = !creating && selected?.versionStatus !== "DRAFT";
  const blocked = busy || parentBusy;
  const canEditDraft = !readOnly && (creating ? permissions.create : permissions.update);

  return (
    <section className="policyVersionEditor">
      <header className="policyVersionHeader">
        <Title level="H4">{t("policy.tabs.versions", { defaultValue: "نسخه‌ها" })}</Title>
        <Button
          design="Emphasized"
          hidden={readOnly || !permissions.create}
          disabled={blocked || readOnly}
          onClick={() => {
            if (readOnly || !confirmLeave()) return;
            setCreating(true);
            setEditing(true);
            setSelected(null);
            setContent("");
            setValidFrom("");
            setValidTo("");
            setDateDrafts({ validFrom: EMPTY_DATE, validTo: EMPTY_DATE });
          }}
        >
          {t("policy.version.new", { defaultValue: "ایجاد نسخه جدید" })}
        </Button>
      </header>

      {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}</MessageStrip> : null}

      <div className="policyVersionList">
        {versions.map((version) => (
          <Button
            key={version.id}
            design={selected?.id === version.id ? "Emphasized" : "Transparent"}
            disabled={blocked}
            onClick={() => select(version)}
          >
            {t("policy.version.label", {
              defaultValue: "نسخه {{number}} — {{status}}",
              number: version.versionNumber,
              status: versionStatusLabel(version.versionStatus, t),
            })}
          </Button>
        ))}
      </div>

      {(creating || selected) ? (
        <div className="policyVersionBody">
          {!readOnly ? (
            <div className="policyVersionActions">
              {!immutable && !editing && permissions.update ? (
                <Button onClick={() => setEditing(true)}>{t("common.edit", { defaultValue: "ویرایش" })}</Button>
              ) : null}
              {editing && !immutable && canEditDraft ? (
                <Button design="Emphasized" disabled={blocked || (!creating && !dirty)} onClick={() => void save()}>
                  {t("common.save", { defaultValue: "ذخیره" })}
                </Button>
              ) : null}
              {selected && selected.versionStatus === "DRAFT" && !editing && permissions.publish ? (
                <Button design="Emphasized" disabled={blocked || !selected.content?.trim()} onClick={() => void publish()}>
                  {t("policy.version.publish", { defaultValue: "انتشار" })}
                </Button>
              ) : null}
              {creating ? (
                <Button design="Transparent" disabled={blocked} onClick={() => applySelection(versions[0] ?? null)}>
                  {t("common.cancel", { defaultValue: "انصراف" })}
                </Button>
              ) : null}
            </div>
          ) : null}

          {selected ? (
            <div className="policyVersionMeta">
              <strong>
                {t("policy.fields.versionNumber", { defaultValue: "شماره نسخه" })}: {selected.versionNumber}
              </strong>
              <span>{versionStatusLabel(selected.versionStatus, t)}</span>
            </div>
          ) : null}

          <TextArea
            rows={10}
            value={content}
            readonly={readOnly || !editing || immutable}
            disabled={blocked}
            placeholder={t("policy.fields.versionContent", { defaultValue: "محتوای نسخه سیاست" })}
            onInput={(event) => setContent(event.target.value)}
          />

          <div className="policyVersionDates">
            <Label>
              {t("policy.fields.validFrom", { defaultValue: "تاریخ اعتبار از" })}
              <PersianDatePicker
                value={validFrom}
                readonly={readOnly || !editing || immutable}
                disabled={blocked}
                accessibleName={t("policy.fields.validFrom", { defaultValue: "تاریخ اعتبار از" })}
                invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "تاریخ نامعتبر است" })}
                onChange={setValidFrom}
                onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validFrom: next }))}
              />
            </Label>
            <Label>
              {t("policy.fields.validTo", { defaultValue: "تاریخ اعتبار تا" })}
              <PersianDatePicker
                value={validTo}
                readonly={readOnly || !editing || immutable}
                disabled={blocked}
                accessibleName={t("policy.fields.validTo", { defaultValue: "تاریخ اعتبار تا" })}
                invalidValueMessage={t("common.invalidPersianDate", { defaultValue: "تاریخ نامعتبر است" })}
                onChange={setValidTo}
                onDraftStateChange={(next) => setDateDrafts((current) => ({ ...current, validTo: next }))}
              />
            </Label>
          </div>
        </div>
      ) : (
        <MessageStrip design="Information" hideCloseButton>
          {t("policy.version.empty", { defaultValue: "هنوز نسخه‌ای برای این سیاست ثبت نشده است." })}
        </MessageStrip>
      )}
    </section>
  );
}

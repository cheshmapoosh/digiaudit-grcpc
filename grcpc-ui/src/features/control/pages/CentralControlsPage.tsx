import { useCallback, useEffect, useRef, useState } from "react";
import { MessageStrip } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { DefinitionListReport } from "@/features/central-catalog/components/DefinitionListReport";
import { DefinitionObjectPage } from "@/features/central-catalog/components/DefinitionObjectPage";
import type { DefinitionDraft } from "@/features/central-catalog/components/catalogPresentation.model";
import { useCatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import {
  toDocumentAggregateDraftError,
  toDocumentAggregateRequest,
  type DocumentAggregateDraftError,
  type ParentSaveDocumentDraftState,
} from "@/features/document";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import type {
  CentralControlDetail,
  CentralControlSummary,
} from "../domain/centralControl.model";
import { centralControlApi } from "../infra/centralControl.api";

export default function CentralControlsPage() {
  const { t } = useTranslation();
  const permissions = useCatalogActionPermissions("CENTRAL_CONTROL");
  const [rows, setRows] = useState<CentralControlSummary[]>([]);
  const [selected, setSelected] = useState<CentralControlDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deletedMode, setDeletedMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentError, setDocumentError] =
    useState<DocumentAggregateDraftError | null>(null);
  const generation = useRef(0);
  useUnsavedChangesGuard(dirty);

  const load = useCallback(
    async (keepId?: string) => {
      const request = ++generation.current;
      setBusy(true);
      try {
        const nextRows = await centralControlApi.list(deletedMode);
        if (request !== generation.current) return;
        setRows(nextRows);
        const id = keepId;
        if (!id || deletedMode || !nextRows.some((row) => row.id === id)) {
          setSelected(null);
          return;
        }
        const detail = await centralControlApi.detail(id);
        if (request === generation.current) setSelected(detail);
      } catch (cause) {
        if (request === generation.current)
          setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (request === generation.current) setBusy(false);
      }
    },
    [deletedMode],
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
  const select = async (row: CentralControlSummary) => {
    if (!confirmLeave()) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const detail = await centralControlApi.detail(row.id);
      if (request === generation.current) {
        setSelected(detail);
        setCreating(false);
        setEditing(false);
        setDirty(false);
      }
    } catch (cause) {
      if (request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  const save = async (
    draft: DefinitionDraft,
    documents: ParentSaveDocumentDraftState,
  ) => {
    setBusy(true);
    setError(null);
    setDocumentError(null);
    generation.current += 1;
    try {
      const common = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        validFrom: draft.validFrom || null,
        validTo: draft.validTo || null,
        documents: toDocumentAggregateRequest(documents),
      };
      const result = creating
        ? await centralControlApi.create({
            ...common,
            code: draft.code.trim().toUpperCase(),
          })
        : await centralControlApi.update(selected!.id, {
            ...common,
            version: selected!.version,
          });
      setCreating(false);
      setEditing(false);
      setDirty(false);
      await load(result.entityId);
    } catch (cause) {
      setDocumentError(toDocumentAggregateDraftError(cause));
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const lifecycle = async (
    action: "activate" | "inactivate" | "delete",
    target = selected,
  ) => {
    if (!target) return;
    setBusy(true);
    generation.current += 1;
    try {
      await centralControlApi.lifecycle(target.id, action, target.version);
      setSelected(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const restore = async (row: CentralControlSummary) => {
    setBusy(true);
    generation.current += 1;
    try {
      await centralControlApi.lifecycle(row.id, "restore", row.version);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="catalogWorkspace">
      <DefinitionListReport
        permissions={permissions}
        title={t("centralCatalog.controls", {
          defaultValue: "کنترل‌های مرکزی",
        })}
        rows={rows}
        selectedId={selected?.id ?? null}
        busy={busy}
        deletedMode={deletedMode}
        onCreate={() => {
          if (!confirmLeave()) return;
          setSelected(null);
          setCreating(true);
          setEditing(true);
          setDirty(false);
          setDocumentError(null);
        }}
        onSelect={(row) => void select(row)}
        onToggleDeleted={() => {
          if (!confirmLeave()) return;
          generation.current += 1;
          setDeletedMode((value) => !value);
          setSelected(null);
        }}
        onRestore={(row) => void restore(row)}
      />
      {creating || selected ? (
        <DefinitionObjectPage
          permissions={permissions}
          options={{
            title: t("centralCatalog.control", { defaultValue: "کنترل مرکزی" }),
            documentTarget: "CENTRAL_CONTROL",
          }}
          value={selected}
          creating={creating}
          editing={editing}
          busy={busy}
          error={error}
          documentError={documentError}
          onDirtyChange={setDirty}
          onEdit={() => setEditing(true)}
          onCancel={() => {
            setCreating(false);
            setEditing(false);
            setDirty(false);
          }}
          onSave={save}
          onLifecycle={(action) => void lifecycle(action)}
        />
      ) : (
        <MessageStrip design="Information" hideCloseButton>
          {t("centralCatalog.selectPrompt", {
            defaultValue: "یک مورد را انتخاب کنید یا مورد جدیدی بسازید.",
          })}
        </MessageStrip>
      )}
    </div>
  );
}

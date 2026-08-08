import { useCallback, useEffect, useRef, useState } from "react";
import { MessageStrip } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { DefinitionListReport } from "@/features/central-catalog/components/DefinitionListReport";
import { DefinitionObjectPage } from "@/features/central-catalog/components/DefinitionObjectPage";
import { CatalogObjectDialog } from "@/features/central-catalog/components/CatalogObjectDialog";
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
  CentralControlObjectiveDetail,
  CentralControlObjectiveSummary,
} from "../domain/centralControlObjective.model";
import { centralControlObjectiveApi } from "../infra/centralControlObjective.api";

export default function CentralControlObjectivesPage() {
  const { t } = useTranslation();
  const permissions = useCatalogActionPermissions("CENTRAL_CONTROL_OBJECTIVE");
  const [rows, setRows] = useState<CentralControlObjectiveSummary[]>([]);
  const [selected, setSelected] =
    useState<CentralControlObjectiveDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
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
        const nextRows = await centralControlObjectiveApi.list(deletedMode);
        if (request !== generation.current) return;
        setRows(nextRows);
        const id = keepId;
        if (!id || deletedMode || !nextRows.some((row) => row.id === id)) {
          setSelected(null);
          return;
        }
        const detail = await centralControlObjectiveApi.detail(id);
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
  const select = async (row: CentralControlObjectiveSummary) => {
    if (!confirmLeave()) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const detail = await centralControlObjectiveApi.detail(row.id);
      if (request === generation.current) {
        setSelected(detail);
        setCreating(false);
        setEditing(false);
        setDirty(false);
        setDialogOpen(true);
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
        ? await centralControlObjectiveApi.create({
            ...common,
            code: draft.code.trim().toUpperCase(),
          })
        : await centralControlObjectiveApi.update(selected!.id, {
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
      await centralControlObjectiveApi.lifecycle(
        target.id,
        action,
        target.version,
      );
      setSelected(null);
      setDialogOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const restore = async (row: CentralControlObjectiveSummary) => {
    setBusy(true);
    generation.current += 1;
    try {
      await centralControlObjectiveApi.lifecycle(
        row.id,
        "restore",
        row.version,
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const dialogTitle = t("centralCatalog.controlObjective", {
    defaultValue: "هدف کنترلی",
  });
  const closeDialog = () => {
    if (!confirmLeave()) return;
    setDialogOpen(false);
    setCreating(false);
    setEditing(false);
    setDirty(false);
    setDocumentError(null);
  };
  return (
    <>
      <div className="catalogListPage">
        <DefinitionListReport
          permissions={permissions}
          title={t("centralCatalog.controlObjectives", {
            defaultValue: "اهداف کنترلی",
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
            setDialogOpen(true);
          }}
          onSelect={(row) => void select(row)}
          onToggleDeleted={() => {
            if (!confirmLeave()) return;
            generation.current += 1;
            setDeletedMode((value) => !value);
            setSelected(null);
            setDialogOpen(false);
          }}
          onRestore={(row) => void restore(row)}
        />
        {error && !creating && !selected ? (
          <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip>
        ) : null}
      </div>
      <CatalogObjectDialog
        open={dialogOpen}
        title={dialogTitle}
        mode={creating ? "create" : editing ? "edit" : "view"}
        onClose={closeDialog}
      >
        <DefinitionObjectPage
          permissions={permissions}
          options={{
            title: dialogTitle,
            documentTarget: "CENTRAL_CONTROL_OBJECTIVE_DEF",
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
            setDialogOpen(Boolean(selected));
          }}
          onSave={save}
          onLifecycle={(action) => void lifecycle(action)}
        />
      </CatalogObjectDialog>
    </>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { CatalogFlexibleColumnLayout } from "@/features/central-catalog/components/CatalogFlexibleColumnLayout";
import { CatalogObjectDialog } from "@/features/central-catalog/components/CatalogObjectDialog";
import { DefinitionListReport } from "@/features/central-catalog/components/DefinitionListReport";
import { DefinitionObjectPage } from "@/features/central-catalog/components/DefinitionObjectPage";
import { HierarchyColumn } from "@/features/central-catalog/components/HierarchyColumn";
import { MoveDialog } from "@/features/central-catalog/components/MoveDialog";
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
  CentralAccountGroupDetail,
  CentralAccountGroupSummary,
} from "../domain/centralAccountGroup.model";
import { centralAccountGroupApi } from "../infra/centralAccountGroup.api";

export default function CentralAccountGroupsPage() {
  const { t } = useTranslation();
  const permissions = useCatalogActionPermissions("CENTRAL_ACCOUNT_GROUP");
  const generation = useRef(0);
  const [rows, setRows] = useState<CentralAccountGroupSummary[]>([]);
  const [selected, setSelected] = useState<CentralAccountGroupDetail | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletedMode, setDeletedMode] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentError, setDocumentError] =
    useState<DocumentAggregateDraftError | null>(null);
  useUnsavedChangesGuard(dirty);
  const confirmLeave = () =>
    !dirty ||
    window.confirm(
      t("centralCatalog.discard", {
        defaultValue: "تغییرات ذخیره‌نشده نادیده گرفته شود؟",
      }),
    );
  const load = useCallback(
    async (keepId?: string) => {
      const request = ++generation.current;
      setBusy(true);
      try {
        const next = await centralAccountGroupApi.list(deletedMode);
        if (request !== generation.current) return;
        setRows(next);
        const id = keepId;
        if (!id || deletedMode || !next.some((row) => row.id === id)) {
          setSelected(null);
          return;
        }
        const detail = await centralAccountGroupApi.detail(id);
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
  const select = async (row: CentralAccountGroupSummary) => {
    if (!confirmLeave()) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const detail = await centralAccountGroupApi.detail(row.id);
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
        ? await centralAccountGroupApi.create({
            ...common,
            code: draft.code.trim().toUpperCase(),
            parentAccountGroupId: createParentId,
            sortOrder: 0,
          })
        : await centralAccountGroupApi.update(selected!.id, {
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
      await centralAccountGroupApi.lifecycle(target.id, action, target.version);
      setSelected(null);
      setDialogOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const restore = async (row: CentralAccountGroupSummary) => {
    setBusy(true);
    generation.current += 1;
    try {
      await centralAccountGroupApi.lifecycle(row.id, "restore", row.version);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const move = async (
    parentAccountGroupId: string | null,
    sortOrder: number,
  ) => {
    if (!selected) return;
    setBusy(true);
    generation.current += 1;
    try {
      await centralAccountGroupApi.move(selected.id, {
        version: selected.version,
        parentAccountGroupId,
        sortOrder,
      });
      setMoveOpen(false);
      await load(selected.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const dialogTitle = t("centralCatalog.accountGroup", {
    defaultValue: "گروه حساب",
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
      <CatalogFlexibleColumnLayout>
        {deletedMode ? (
          <DefinitionListReport
            permissions={permissions}
            title={t("centralCatalog.deletedAccountGroups", {
              defaultValue: "گروه حساب‌های حذف‌شده",
            })}
            rows={rows}
            selectedId={null}
            busy={busy}
            deletedMode
            onCreate={() => undefined}
            onSelect={() => undefined}
            onToggleDeleted={() => {
              generation.current += 1;
              setDeletedMode(false);
            }}
            onRestore={(row) => void restore(row)}
          />
        ) : (
          <HierarchyColumn
            canCreate={permissions.create}
            title={t("centralCatalog.accountGroups", {
              defaultValue: "ساختار گروه حساب‌ها",
            })}
            rows={rows}
            selectedId={selected?.id ?? null}
            busy={busy}
            getParentId={(row) => row.parentAccountGroupId}
            onToggleDeleted={() => {
              if (!confirmLeave()) return;
              generation.current += 1;
              setDeletedMode(true);
              setSelected(null);
              setDialogOpen(false);
            }}
            onSelect={(row) => void select(row)}
            onCreate={() => {
              if (!confirmLeave()) return;
              setCreateParentId(selected?.id ?? null);
              setSelected(null);
              setCreating(true);
              setEditing(true);
              setDirty(false);
              setDialogOpen(true);
            }}
          />
        )}
      </CatalogFlexibleColumnLayout>
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
            documentTarget: "CENTRAL_ACCOUNT_GROUP",
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
        >
          {selected && !editing && (
            <Button
              hidden={!permissions.move}
              onClick={() => setMoveOpen(true)}
            >
              {t("centralCatalog.move", { defaultValue: "جابجایی" })}
            </Button>
          )}
        </DefinitionObjectPage>
      </CatalogObjectDialog>
      <MoveDialog
        open={moveOpen}
        requiredParent={false}
        currentParentId={selected?.parentAccountGroupId ?? null}
        currentSortOrder={selected?.sortOrder ?? 0}
        destinations={rows
          .filter((row) => row.id !== selected?.id)
          .map((row) => ({ id: row.id, label: `${row.code} — ${row.title}` }))}
        busy={busy}
        onClose={() => setMoveOpen(false)}
        onMove={(parent, sort) => void move(parent, sort)}
      />
    </>
  );
}

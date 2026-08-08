import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { CatalogFlexibleColumnLayout } from "@/features/central-catalog/components/CatalogFlexibleColumnLayout";
import { CatalogObjectDialog } from "@/features/central-catalog/components/CatalogObjectDialog";
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
  CentralRiskCategoryDetail,
  CentralRiskCategorySummary,
  CentralRiskTemplateDetail,
  CentralRiskTemplateSummary,
} from "../domain/centralRisk.model";
import { centralRiskApi } from "../infra/centralRisk.api";

type SelectedKind = "category" | "template";
export default function CentralRiskPage() {
  const { t } = useTranslation();
  const permissions = useCatalogActionPermissions("CENTRAL_RISK");
  const generation = useRef(0);
  const [categories, setCategories] = useState<CentralRiskCategorySummary[]>(
    [],
  );
  const [templates, setTemplates] = useState<CentralRiskTemplateSummary[]>([]);
  const [category, setCategory] = useState<CentralRiskCategoryDetail | null>(
    null,
  );
  const [template, setTemplate] = useState<CentralRiskTemplateDetail | null>(
    null,
  );
  const [kind, setKind] = useState<SelectedKind>("category");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentError, setDocumentError] =
    useState<DocumentAggregateDraftError | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  useUnsavedChangesGuard(dirty);
  const confirmLeave = () =>
    !dirty ||
    window.confirm(
      t("centralCatalog.discard", {
        defaultValue: "تغییرات ذخیره‌نشده نادیده گرفته شود؟",
      }),
    );
  const loadCategories = useCallback(async (keepId?: string) => {
    const request = ++generation.current;
    setBusy(true);
    try {
      const rows = await centralRiskApi.listCategories();
      if (request !== generation.current) return;
      setCategories(rows);
      const id = keepId;
      if (id && rows.some((row) => row.id === id)) {
        const detail = await centralRiskApi.category(id);
        if (request === generation.current) setCategory(detail);
      }
    } catch (cause) {
      if (request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }, []);
  const loadTemplates = useCallback(
    async (categoryId: string, keepId?: string) => {
      const request = ++generation.current;
      setBusy(true);
      try {
        const rows = await centralRiskApi.listTemplates(categoryId);
        if (request !== generation.current) return;
        setTemplates(rows);
        if (keepId && rows.some((row) => row.id === keepId)) {
          const detail = await centralRiskApi.template(keepId);
          if (request === generation.current) setTemplate(detail);
        } else setTemplate(null);
      } catch (cause) {
        if (request === generation.current)
          setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (request === generation.current) setBusy(false);
      }
    },
    [],
  );
  useEffect(() => {
    void loadCategories();
    return () => {
      generation.current += 1;
    };
  }, [loadCategories]);
  const selectCategory = async (row: CentralRiskCategorySummary) => {
    if (!confirmLeave()) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const detail = await centralRiskApi.category(row.id);
      if (request !== generation.current) return;
      setCategory(detail);
      setKind("category");
      setCreating(false);
      setEditing(false);
      setTemplate(null);
      setDirty(false);
      setDialogOpen(true);
      await loadTemplates(row.id);
    } catch (cause) {
      if (request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  const selectTemplate = async (row: CentralRiskTemplateSummary) => {
    if (!confirmLeave()) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const detail = await centralRiskApi.template(row.id);
      if (request === generation.current) {
        setTemplate(detail);
        setKind("template");
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
  const startCategory = () => {
    if (!confirmLeave()) return;
    setCreateParentId(category?.id ?? null);
    setKind("category");
    setCategory(null);
    setTemplate(null);
    setCreating(true);
    setEditing(true);
    setDirty(false);
    setDialogOpen(true);
  };
  const startTemplate = () => {
    if (!category || !confirmLeave()) return;
    setKind("template");
    setTemplate(null);
    setCreating(true);
    setEditing(true);
    setDirty(false);
    setDialogOpen(true);
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
      if (kind === "category") {
        const result = creating
          ? await centralRiskApi.createCategory({
              ...common,
              code: draft.code.trim().toUpperCase(),
              parentCategoryId: createParentId,
              sortOrder: 0,
            })
          : await centralRiskApi.updateCategory(category!.id, {
              ...common,
              version: category!.version,
            });
        setCreating(false);
        setEditing(false);
        setDirty(false);
        await loadCategories(result.entityId);
      } else {
        const result = creating
          ? await centralRiskApi.createTemplate({
              ...common,
              code: draft.code.trim().toUpperCase(),
              riskCategoryId: category!.id,
              sortOrder: 0,
            })
          : await centralRiskApi.updateTemplate(template!.id, {
              ...common,
              version: template!.version,
            });
        setCreating(false);
        setEditing(false);
        setDirty(false);
        await loadTemplates(category!.id, result.entityId);
      }
    } catch (cause) {
      setDocumentError(toDocumentAggregateDraftError(cause));
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const lifecycle = async (action: "activate" | "inactivate" | "delete") => {
    const target = kind === "category" ? category : template;
    if (!target) return;
    setBusy(true);
    generation.current += 1;
    try {
      if (kind === "category") {
        await centralRiskApi.categoryLifecycle(
          target.id,
          action,
          target.version,
        );
        setCategory(null);
        setTemplates([]);
        setDialogOpen(false);
        await loadCategories();
      } else {
        await centralRiskApi.templateLifecycle(
          target.id,
          action,
          target.version,
        );
        setTemplate(null);
        setDialogOpen(false);
        await loadTemplates(category!.id);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const move = async (parentId: string | null, sortOrder: number) => {
    const target = kind === "category" ? category : template;
    if (!target) return;
    setBusy(true);
    generation.current += 1;
    try {
      if (kind === "category") {
        await centralRiskApi.moveCategory(target.id, {
          version: target.version,
          parentCategoryId: parentId,
          sortOrder,
        });
        await loadCategories(target.id);
      } else {
        await centralRiskApi.moveTemplate(target.id, {
          version: target.version,
          riskCategoryId: parentId!,
          sortOrder,
        });
        if (parentId) {
          const nextCategory = await centralRiskApi.category(parentId);
          setCategory(nextCategory);
          await loadTemplates(parentId, target.id);
        }
      }
      setMoveOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const value = kind === "category" ? category : template;
  const options =
    kind === "category"
      ? {
          title: t("centralCatalog.riskCategory", {
            defaultValue: "دسته ریسک",
          }),
          documentTarget: "CENTRAL_RISK_CATEGORY" as const,
        }
      : {
          title: t("centralCatalog.riskTemplate", {
            defaultValue: "الگوی ریسک",
          }),
          documentTarget: "CENTRAL_RISK_TEMPLATE" as const,
        };
  const closeDialog = () => {
    if (!confirmLeave()) return;
    setCreating(false);
    setEditing(false);
    setDirty(false);
    setDocumentError(null);
    setDialogOpen(false);
  };
  return (
    <>
      <CatalogFlexibleColumnLayout>
        <HierarchyColumn
          canCreate={permissions.create}
          title={t("centralCatalog.riskCategories", {
            defaultValue: "ساختار طبقات ریسک",
          })}
          rows={categories}
          selectedId={category?.id ?? null}
          busy={busy}
          getParentId={(row) => row.parentCategoryId}
          onSelect={(row) => void selectCategory(row)}
          onCreate={startCategory}
        />
        <HierarchyColumn
          canCreate={permissions.create}
          title={t("centralCatalog.riskTemplates", {
            defaultValue: "الگوهای ریسک طبقهٔ انتخاب‌شده",
          })}
          rows={templates}
          selectedId={template?.id ?? null}
          busy={busy || !category}
          onSelect={(row) => void selectTemplate(row)}
          onCreate={startTemplate}
        />
      </CatalogFlexibleColumnLayout>
      <CatalogObjectDialog
        open={dialogOpen}
        title={options.title}
        mode={creating ? "create" : editing ? "edit" : "view"}
        onClose={closeDialog}
      >
        <DefinitionObjectPage
          permissions={permissions}
          options={options}
          value={value}
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
            setDialogOpen(Boolean(value));
          }}
          onSave={save}
          onLifecycle={(action) => void lifecycle(action)}
        >
          {value && !editing && (
            <Button
              hidden={!permissions.move}
              disabled={busy}
              onClick={() => setMoveOpen(true)}
            >
              {t("centralCatalog.move", { defaultValue: "جابجایی" })}
            </Button>
          )}
        </DefinitionObjectPage>
      </CatalogObjectDialog>
      <MoveDialog
        open={moveOpen}
        requiredParent={kind === "template"}
        currentParentId={
          kind === "category"
            ? (category?.parentCategoryId ?? null)
            : (template?.riskCategoryId ?? null)
        }
        currentSortOrder={
          kind === "category"
            ? (category?.sortOrder ?? 0)
            : (template?.sortOrder ?? 0)
        }
        destinations={categories
          .filter((row) => row.id !== value?.id)
          .map((row) => ({ id: row.id, label: `${row.code} — ${row.title}` }))}
        busy={busy}
        onClose={() => setMoveOpen(false)}
        onMove={(parentId, sortOrder) => void move(parentId, sortOrder)}
      />
    </>
  );
}

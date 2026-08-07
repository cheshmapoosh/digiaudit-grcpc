import { useCallback, useEffect, useRef, useState } from "react";
import { Button, MessageStrip } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { CatalogFlexibleColumnLayout } from "@/features/central-catalog/components/CatalogFlexibleColumnLayout";
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
  CentralRegulationDetail,
  CentralRegulationGroupDetail,
  CentralRegulationGroupSummary,
  CentralRegulationRequirementDetail,
  CentralRegulationRequirementSummary,
  CentralRegulationSummary,
} from "../domain/centralRegulation.model";
import { centralRegulationApi } from "../infra/centralRegulation.api";
type Level = "group" | "regulation" | "requirement";
export default function CentralRegulationsPage() {
  const { t } = useTranslation(),
    generation = useRef(0);
  const permissions = useCatalogActionPermissions("CENTRAL_REGULATION");
  const [groups, setGroups] = useState<CentralRegulationGroupSummary[]>([]),
    [regulations, setRegulations] = useState<CentralRegulationSummary[]>([]),
    [requirements, setRequirements] = useState<
      CentralRegulationRequirementSummary[]
    >([]);
  const [group, setGroup] = useState<CentralRegulationGroupDetail | null>(null),
    [regulation, setRegulation] = useState<CentralRegulationDetail | null>(
      null,
    ),
    [requirement, setRequirement] =
      useState<CentralRegulationRequirementDetail | null>(null);
  const [level, setLevel] = useState<Level>("group"),
    [creating, setCreating] = useState(false),
    [editing, setEditing] = useState(false),
    [ownerId, setOwnerId] = useState<string | null>(null),
    [moveOpen, setMoveOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState<string | null>(null),
    [documentError, setDocumentError] =
      useState<DocumentAggregateDraftError | null>(null);
  useUnsavedChangesGuard(dirty);
  const confirmLeave = () =>
    !dirty ||
    window.confirm(
      t("centralCatalog.discard", {
        defaultValue: "تغییرات ذخیره‌نشده نادیده گرفته شود؟",
      }),
    );
  const loadGroups = useCallback(async (keep?: string) => {
    const request = ++generation.current;
    setBusy(true);
    try {
      const rows = await centralRegulationApi.listGroups();
      if (request !== generation.current) return;
      setGroups(rows);
      if (keep) {
        const detail = await centralRegulationApi.group(keep);
        if (request === generation.current) setGroup(detail);
      }
    } catch (cause) {
      if (request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }, []);
  const loadRegulations = useCallback(
    async (groupId: string, keep?: string) => {
      const request = ++generation.current;
      setBusy(true);
      try {
        const rows = await centralRegulationApi.listRegulations(groupId);
        if (request !== generation.current) return;
        setRegulations(rows);
        setRequirements([]);
        if (keep) {
          const detail = await centralRegulationApi.regulation(keep);
          if (request === generation.current) setRegulation(detail);
        } else setRegulation(null);
      } catch (cause) {
        if (request === generation.current)
          setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (request === generation.current) setBusy(false);
      }
    },
    [],
  );
  const loadRequirements = useCallback(
    async (regulationId: string, keep?: string) => {
      const request = ++generation.current;
      setBusy(true);
      try {
        const rows = await centralRegulationApi.listRequirements(regulationId);
        if (request !== generation.current) return;
        setRequirements(rows);
        if (keep) {
          const detail = await centralRegulationApi.requirement(keep);
          if (request === generation.current) setRequirement(detail);
        } else setRequirement(null);
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
    void loadGroups();
    return () => {
      generation.current += 1;
    };
  }, [loadGroups]);
  const selectGroup = async (row: CentralRegulationGroupSummary) => {
    if (!confirmLeave()) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const detail = await centralRegulationApi.group(row.id);
      if (request !== generation.current) return;
      setGroup(detail);
      setRegulation(null);
      setRequirement(null);
      setLevel("group");
      setCreating(false);
      setEditing(false);
      setDirty(false);
      await loadRegulations(row.id);
    } catch (cause) {
      if (request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  const selectRegulation = async (row: CentralRegulationSummary) => {
    if (!confirmLeave()) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const detail = await centralRegulationApi.regulation(row.id);
      if (request !== generation.current) return;
      setRegulation(detail);
      setRequirement(null);
      setLevel("regulation");
      setCreating(false);
      setEditing(false);
      setDirty(false);
      await loadRequirements(row.id);
    } catch (cause) {
      if (request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  const selectRequirement = async (
    row: CentralRegulationRequirementSummary,
  ) => {
    if (!confirmLeave()) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const detail = await centralRegulationApi.requirement(row.id);
      if (request === generation.current) {
        setRequirement(detail);
        setLevel("requirement");
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
  const start = (next: Level) => {
    if (!confirmLeave()) return;
    if (
      (next === "regulation" && !group) ||
      (next === "requirement" && !regulation)
    )
      return;
    setLevel(next);
    setOwnerId(
      next === "group"
        ? (group?.id ?? null)
        : next === "regulation"
          ? group!.id
          : regulation!.id,
    );
    if (next === "group") setGroup(null);
    if (next === "regulation") setRegulation(null);
    if (next === "requirement") setRequirement(null);
    setCreating(true);
    setEditing(true);
    setDirty(false);
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
      let result;
      if (level === "group")
        result = creating
          ? await centralRegulationApi.createGroup({
              ...common,
              code: draft.code.trim().toUpperCase(),
              parentGroupId: ownerId,
              sortOrder: 0,
            })
          : await centralRegulationApi.updateGroup(group!.id, {
              ...common,
              version: group!.version,
            });
      else if (level === "regulation")
        result = creating
          ? await centralRegulationApi.createRegulation({
              ...common,
              code: draft.code.trim().toUpperCase(),
              regulationGroupId: ownerId!,
              sortOrder: 0,
            })
          : await centralRegulationApi.updateRegulation(regulation!.id, {
              ...common,
              version: regulation!.version,
            });
      else
        result = creating
          ? await centralRegulationApi.createRequirement({
              ...common,
              code: draft.code.trim().toUpperCase(),
              regulationId: ownerId!,
              sortOrder: 0,
            })
          : await centralRegulationApi.updateRequirement(requirement!.id, {
              ...common,
              version: requirement!.version,
            });
      setCreating(false);
      setEditing(false);
      setDirty(false);
      if (level === "group") await loadGroups(result.entityId);
      else if (level === "regulation")
        await loadRegulations(group!.id, result.entityId);
      else await loadRequirements(regulation!.id, result.entityId);
    } catch (cause) {
      setDocumentError(toDocumentAggregateDraftError(cause));
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const lifecycle = async (action: "activate" | "inactivate" | "delete") => {
    const target =
      level === "group"
        ? group
        : level === "regulation"
          ? regulation
          : requirement;
    if (!target) return;
    setBusy(true);
    generation.current += 1;
    try {
      if (level === "group") {
        await centralRegulationApi.groupLifecycle(
          target.id,
          action,
          target.version,
        );
        setGroup(null);
        await loadGroups();
      } else if (level === "regulation") {
        await centralRegulationApi.regulationLifecycle(
          target.id,
          action,
          target.version,
        );
        setRegulation(null);
        await loadRegulations(group!.id);
      } else {
        await centralRegulationApi.requirementLifecycle(
          target.id,
          action,
          target.version,
        );
        setRequirement(null);
        await loadRequirements(regulation!.id);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const move = async (parentId: string | null, sortOrder: number) => {
    const target =
      level === "group"
        ? group
        : level === "regulation"
          ? regulation
          : requirement;
    if (!target) return;
    setBusy(true);
    generation.current += 1;
    try {
      if (level === "group") {
        await centralRegulationApi.moveGroup(target.id, {
          version: target.version,
          parentGroupId: parentId,
          sortOrder,
        });
        await loadGroups(target.id);
      } else if (level === "regulation") {
        await centralRegulationApi.moveRegulation(target.id, {
          version: target.version,
          regulationGroupId: parentId!,
          sortOrder,
        });
        await loadRegulations(parentId!, target.id);
      } else {
        await centralRegulationApi.moveRequirement(target.id, {
          version: target.version,
          regulationId: parentId!,
          sortOrder,
        });
        await loadRequirements(parentId!, target.id);
      }
      setMoveOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const value =
    level === "group"
      ? group
      : level === "regulation"
        ? regulation
        : requirement;
  const options =
    level === "group"
      ? {
          title: t("centralCatalog.regulationGroup", {
            defaultValue: "گروه مقررات",
          }),
          documentTarget: "CENTRAL_REGULATION_GROUP" as const,
        }
      : level === "regulation"
        ? {
            title: t("centralCatalog.regulation", { defaultValue: "مقرره" }),
            documentTarget: "CENTRAL_REGULATION" as const,
          }
        : {
            title: t("centralCatalog.regulationRequirement", {
              defaultValue: "الزام مقرره",
            }),
            documentTarget: "CENTRAL_REQUIREMENT" as const,
          };
  const destinations =
    level === "group"
      ? groups
          .filter((row) => row.id !== value?.id)
          .map((row) => ({ id: row.id, label: `${row.code} — ${row.title}` }))
      : level === "regulation"
        ? groups.map((row) => ({
            id: row.id,
            label: `${row.code} — ${row.title}`,
          }))
        : regulations.map((row) => ({
            id: row.id,
            label: `${row.code} — ${row.title}`,
          }));
  const parentId =
    level === "group"
      ? (group?.parentGroupId ?? null)
      : level === "regulation"
        ? (regulation?.regulationGroupId ?? null)
        : (requirement?.regulationId ?? null);
  return (
    <CatalogFlexibleColumnLayout>
      <HierarchyColumn
        canCreate={permissions.create}
        title={t("centralCatalog.regulationGroups", {
          defaultValue: "گروه‌های مقررات",
        })}
        rows={groups}
        selectedId={group?.id ?? null}
        busy={busy}
        onSelect={(row) => void selectGroup(row)}
        onCreate={() => start("group")}
      />
      <HierarchyColumn
        canCreate={permissions.create}
        title={t("centralCatalog.regulations", { defaultValue: "مقررات" })}
        rows={regulations}
        selectedId={regulation?.id ?? null}
        busy={busy || !group}
        onSelect={(row) => void selectRegulation(row)}
        onCreate={() => start("regulation")}
      />
      <HierarchyColumn
        canCreate={permissions.create}
        title={t("centralCatalog.regulationRequirements", {
          defaultValue: "الزامات",
        })}
        rows={requirements}
        selectedId={requirement?.id ?? null}
        busy={busy || !regulation}
        onSelect={(row) => void selectRequirement(row)}
        onCreate={() => start("requirement")}
      />
      {creating || value ? (
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
          }}
          onSave={save}
          onLifecycle={(action) => void lifecycle(action)}
        >
          {value && !editing && (
            <Button
              hidden={!permissions.move}
              onClick={() => setMoveOpen(true)}
            >
              {t("centralCatalog.move", { defaultValue: "جابجایی" })}
            </Button>
          )}
        </DefinitionObjectPage>
      ) : (
        <MessageStrip design="Information" hideCloseButton>
          {t("centralCatalog.selectPrompt", {
            defaultValue: "یکی از سطوح مقررات را انتخاب کنید.",
          })}
        </MessageStrip>
      )}
      <MoveDialog
        open={moveOpen}
        requiredParent={level !== "group"}
        currentParentId={parentId}
        currentSortOrder={value?.sortOrder ?? 0}
        destinations={destinations}
        busy={busy}
        onClose={() => setMoveOpen(false)}
        onMove={(parent, sort) => void move(parent, sort)}
      />
    </CatalogFlexibleColumnLayout>
  );
}

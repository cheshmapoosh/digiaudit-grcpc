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
import { PolicyVersionEditor } from "../components/PolicyVersionEditor";
import type {
  CentralPolicyDetail,
  CentralPolicyGroupDetail,
  CentralPolicyGroupSummary,
  CentralPolicySummary,
} from "../domain/centralPolicy.model";
import { centralPolicyApi } from "../infra/centralPolicy.api";
type Level = "group" | "policy";
export default function CentralPoliciesPage() {
  const { t } = useTranslation(),
    generation = useRef(0);
  const permissions = useCatalogActionPermissions("CENTRAL_POLICY");
  const [groups, setGroups] = useState<CentralPolicyGroupSummary[]>([]),
    [policies, setPolicies] = useState<CentralPolicySummary[]>([]),
    [group, setGroup] = useState<CentralPolicyGroupDetail | null>(null),
    [policy, setPolicy] = useState<CentralPolicyDetail | null>(null),
    [level, setLevel] = useState<Level>("group"),
    [creating, setCreating] = useState(false),
    [editing, setEditing] = useState(false),
    [ownerId, setOwnerId] = useState<string | null>(null),
    [moveOpen, setMoveOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [objectDirty, setObjectDirty] = useState(false),
    [versionDirty, setVersionDirty] = useState(false),
    [error, setError] = useState<string | null>(null),
    [documentError, setDocumentError] =
      useState<DocumentAggregateDraftError | null>(null);
  const dirty = objectDirty || versionDirty;
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
      const rows = await centralPolicyApi.listGroups();
      if (request !== generation.current) return;
      setGroups(rows);
      if (keep) {
        const detail = await centralPolicyApi.group(keep);
        if (request === generation.current) setGroup(detail);
      }
    } catch (cause) {
      if (request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }, []);
  const loadPolicies = useCallback(async (groupId: string, keep?: string) => {
    const request = ++generation.current;
    setBusy(true);
    try {
      const rows = await centralPolicyApi.listPolicies(groupId);
      if (request !== generation.current) return;
      setPolicies(rows);
      if (keep) {
        const detail = await centralPolicyApi.policy(keep);
        if (request === generation.current) setPolicy(detail);
      } else setPolicy(null);
    } catch (cause) {
      if (request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    void loadGroups();
    return () => {
      generation.current += 1;
    };
  }, [loadGroups]);
  const selectGroup = async (row: CentralPolicyGroupSummary) => {
    if (!confirmLeave()) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const detail = await centralPolicyApi.group(row.id);
      if (request !== generation.current) return;
      setGroup(detail);
      setPolicy(null);
      setLevel("group");
      setCreating(false);
      setEditing(false);
      setObjectDirty(false);
      setVersionDirty(false);
      await loadPolicies(row.id);
    } catch (cause) {
      if (request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  const selectPolicy = async (row: CentralPolicySummary) => {
    if (!confirmLeave()) return;
    const request = ++generation.current;
    setBusy(true);
    try {
      const detail = await centralPolicyApi.policy(row.id);
      if (request === generation.current) {
        setPolicy(detail);
        setLevel("policy");
        setCreating(false);
        setEditing(false);
        setObjectDirty(false);
        setVersionDirty(false);
      }
    } catch (cause) {
      if (request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  const start = (next: Level) => {
    if (!confirmLeave() || (next === "policy" && !group)) return;
    setLevel(next);
    setOwnerId(next === "group" ? (group?.id ?? null) : group!.id);
    if (next === "group") setGroup(null);
    else setPolicy(null);
    setCreating(true);
    setEditing(true);
    setObjectDirty(false);
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
      const result =
        level === "group"
          ? creating
            ? await centralPolicyApi.createGroup({
                ...common,
                code: draft.code.trim().toUpperCase(),
                parentGroupId: ownerId,
                sortOrder: 0,
              })
            : await centralPolicyApi.updateGroup(group!.id, {
                ...common,
                version: group!.version,
              })
          : creating
            ? await centralPolicyApi.createPolicy({
                ...common,
                code: draft.code.trim().toUpperCase(),
                policyGroupId: ownerId!,
                sortOrder: 0,
              })
            : await centralPolicyApi.updatePolicy(policy!.id, {
                ...common,
                version: policy!.version,
              });
      setCreating(false);
      setEditing(false);
      setObjectDirty(false);
      if (level === "group") await loadGroups(result.entityId);
      else await loadPolicies(group!.id, result.entityId);
    } catch (cause) {
      setDocumentError(toDocumentAggregateDraftError(cause));
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const lifecycle = async (action: "activate" | "inactivate" | "delete") => {
    const target = level === "group" ? group : policy;
    if (!target) return;
    setBusy(true);
    generation.current += 1;
    try {
      if (level === "group") {
        await centralPolicyApi.groupLifecycle(
          target.id,
          action,
          target.version,
        );
        setGroup(null);
        setPolicies([]);
        await loadGroups();
      } else {
        await centralPolicyApi.policyLifecycle(
          target.id,
          action,
          target.version,
        );
        setPolicy(null);
        await loadPolicies(group!.id);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const move = async (parentId: string | null, sortOrder: number) => {
    const target = level === "group" ? group : policy;
    if (!target) return;
    setBusy(true);
    generation.current += 1;
    try {
      if (level === "group") {
        await centralPolicyApi.moveGroup(target.id, {
          version: target.version,
          parentGroupId: parentId,
          sortOrder,
        });
        await loadGroups(target.id);
      } else {
        await centralPolicyApi.movePolicy(target.id, {
          version: target.version,
          policyGroupId: parentId!,
          sortOrder,
        });
        await loadPolicies(parentId!, target.id);
      }
      setMoveOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const value = level === "group" ? group : policy,
    options =
      level === "group"
        ? {
            title: t("centralCatalog.policyGroup", {
              defaultValue: "گروه خط‌مشی",
            }),
            documentTarget: "CENTRAL_POLICY_GROUP" as const,
          }
        : {
            title: t("centralCatalog.policy", { defaultValue: "خط‌مشی" }),
            documentTarget: "CENTRAL_POLICY" as const,
          },
    destinations = groups
      .filter((row) => level !== "group" || row.id !== value?.id)
      .map((row) => ({ id: row.id, label: `${row.code} — ${row.title}` })),
    parentId =
      level === "group"
        ? (group?.parentGroupId ?? null)
        : (policy?.policyGroupId ?? null);
  return (
    <CatalogFlexibleColumnLayout>
      <HierarchyColumn
        canCreate={permissions.create}
        title={t("centralCatalog.policyGroups", {
          defaultValue: "گروه‌های خط‌مشی",
        })}
        rows={groups}
        selectedId={group?.id ?? null}
        busy={busy}
        onSelect={(row) => void selectGroup(row)}
        onCreate={() => start("group")}
      />
      <HierarchyColumn
        canCreate={permissions.create}
        title={t("centralCatalog.policies", { defaultValue: "خط‌مشی‌ها" })}
        rows={policies}
        selectedId={policy?.id ?? null}
        busy={busy || !group}
        onSelect={(row) => void selectPolicy(row)}
        onCreate={() => start("policy")}
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
          onDirtyChange={setObjectDirty}
          onEdit={() => setEditing(true)}
          onCancel={() => {
            setCreating(false);
            setEditing(false);
            setObjectDirty(false);
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
            defaultValue: "یک گروه یا خط‌مشی را انتخاب کنید.",
          })}
        </MessageStrip>
      )}
      {policy && !creating && (
        <PolicyVersionEditor
          permissions={permissions}
          policyId={policy.id}
          busy={busy}
          onDirtyChange={setVersionDirty}
        />
      )}
      <MoveDialog
        open={moveOpen}
        requiredParent={level === "policy"}
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

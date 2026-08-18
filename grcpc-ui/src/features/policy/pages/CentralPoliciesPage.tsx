import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Dialog, MessageStrip } from "@ui5/webcomponents-react";
import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import { useCatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import { toDocumentAggregateDraftError, type DocumentAggregateDraftError } from "@/features/document";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import CentralPolicyListReport from "../components/CentralPolicyListReport";
import CentralPolicySummaryPanel from "../components/CentralPolicySummaryPanel";
import type { PolicyParentCandidate } from "../components/PolicyParentValueHelpDialog";
import type {
  CentralPolicyAnyDetail,
  CentralPolicyDetail,
  CentralPolicyGroupDetail,
  CentralPolicyGroupSummary,
  CentralPolicyNodeType,
  CentralPolicySummary,
} from "../domain/centralPolicy.model";
import { centralPolicyApi } from "../infra/centralPolicy.api";
import {
  collectPolicyGroupDescendantIds,
  type CentralPolicyTreeNode,
} from "../utils/centralPolicy.tree";
import CentralPolicyObjectPage, {
  type CentralPolicyObjectDraft,
  type CentralPolicyObjectMode,
  type CentralPolicyTabKey,
} from "./CentralPolicyObjectPage";
import "../policy.css";

type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

function resolveUiDir(): UiDir {
  if (typeof document === "undefined") return "rtl";
  const htmlDir = document.documentElement.getAttribute("dir");
  if (htmlDir === "rtl" || htmlDir === "ltr") return htmlDir;
  return document.body?.getAttribute("dir") === "ltr" ? "ltr" : "rtl";
}

function useResolvedUiDir(): UiDir {
  const [dir, setDir] = useState<UiDir>(() => resolveUiDir());
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setDir(resolveUiDir());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, []);
  return dir;
}

function isOwnDialogCloseEvent(event: unknown) {
  const candidate = event as { target?: EventTarget | null; currentTarget?: EventTarget | null };
  return Boolean(candidate.target && candidate.currentTarget && candidate.target === candidate.currentTarget);
}

function detailParentId(type: CentralPolicyNodeType, value: CentralPolicyAnyDetail): string | null {
  return type === "GROUP"
    ? (value as CentralPolicyGroupDetail).parentGroupId
    : (value as CentralPolicyDetail).policyGroupId;
}

function detailToNode(type: CentralPolicyNodeType, value: CentralPolicyAnyDetail): CentralPolicyTreeNode {
  return {
    id: value.id,
    code: value.code,
    title: value.title,
    type,
    status: value.status,
    parentId: detailParentId(type, value),
    sortOrder: value.sortOrder,
    children: [],
  };
}

export default function CentralPoliciesPage() {
  const { t } = useTranslation();
  const appDir = useResolvedUiDir();
  const permissions = useCatalogActionPermissions("CENTRAL_POLICY");
  const [groups, setGroups] = useState<CentralPolicyGroupSummary[]>([]);
  const [policies, setPolicies] = useState<CentralPolicySummary[]>([]);
  const [selectedNode, setSelectedNode] = useState<CentralPolicyTreeNode | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CentralPolicyAnyDetail | null>(null);
  const [searchText, setSearchText] = useState("");
  const [expansionAnchorId, setExpansionAnchorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<DocumentAggregateDraftError | null>(null);
  const [dirty, setDirty] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<CentralPolicyObjectMode>("view");
  const [modalType, setModalType] = useState<CentralPolicyNodeType>("GROUP");
  const [modalValue, setModalValue] = useState<CentralPolicyAnyDetail | null>(null);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CentralPolicyTabKey>("general");
  const [deleteCandidate, setDeleteCandidate] = useState<CentralPolicyTreeNode | null>(null);
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const pendingLeaveActionRef = useRef<(() => void) | null>(null);
  const { blocker } = useUnsavedChangesGuard(dirty);

  const mapError = useCallback((error: unknown, fallback: string) => {
    const candidate = error as { code?: string; message?: string } | null;
    const code = candidate?.code ?? candidate?.message;
    switch (code) {
      case "DUPLICATE_BUSINESS_KEY":
        return t("policy.errors.duplicateCode", { defaultValue: "شناسه تکراری است." });
      case "MASTER_DATA_NOT_FOUND":
      case "NOT_FOUND":
      case "PARENT_NOT_FOUND":
        return t("policy.errors.notFound", { defaultValue: "آیتم موردنظر یافت نشد." });
      case "VERSION_CONFLICT":
        return t("policy.errors.versionConflict", { defaultValue: "اطلاعات همزمان تغییر کرده است. دوباره تلاش کنید." });
      case "INVALID_PARENT":
      case "INVALID_HIERARCHY_MOVE":
      case "HIERARCHY_CYCLE":
      case "HIERARCHY_SELF_PARENT":
        return t("policy.errors.invalidParent", { defaultValue: "والد انتخاب‌شده معتبر نیست." });
      case "DEPENDENCY_EXISTS":
        return t("policy.errors.dependencies", { defaultValue: "به دلیل وجود زیرمجموعه یا وابستگی، حذف مجاز نیست." });
      default:
        return fallback;
    }
  }, [t]);

  const requestLeave = useCallback((action: () => void) => {
    if (!dirty) return action();
    pendingLeaveActionRef.current = action;
    setLeaveConfirmationOpen(true);
  }, [dirty]);

  const stay = useCallback(() => {
    if (blocker.state === "blocked") blocker.reset();
    pendingLeaveActionRef.current = null;
    setLeaveConfirmationOpen(false);
  }, [blocker]);

  const confirmLeave = useCallback(() => {
    const action = pendingLeaveActionRef.current;
    pendingLeaveActionRef.current = null;
    setLeaveConfirmationOpen(false);
    setDirty(false);
    if (blocker.state === "blocked") blocker.proceed();
    else action?.();
  }, [blocker]);

  const loadRows = useCallback(async () => {
    const request = ++listGeneration.current;
    setBusy(true);
    try {
      const [nextGroups, nextPolicies] = await Promise.all([
        centralPolicyApi.listGroups(),
        centralPolicyApi.listPolicies(),
      ]);
      if (request !== listGeneration.current) return false;
      setGroups(nextGroups);
      setPolicies(nextPolicies);
      setPageError(null);
      return true;
    } catch (error) {
      if (request === listGeneration.current) {
        setPageError(mapError(error, t("policy.errors.loadList", { defaultValue: "خطا در بارگذاری ساختار سیاست." })));
      }
      return false;
    } finally {
      if (request === listGeneration.current) setBusy(false);
    }
  }, [mapError, t]);

  const fetchDetail = useCallback((type: CentralPolicyNodeType, id: string) =>
    type === "GROUP" ? centralPolicyApi.group(id) : centralPolicyApi.policy(id), []);

  const loadDetail = useCallback(async (node: CentralPolicyTreeNode) => {
    const request = ++detailGeneration.current;
    setBusy(true);
    try {
      const detail = await fetchDetail(node.type, node.id);
      if (request !== detailGeneration.current) return null;
      setPageError(null);
      return detail;
    } catch (error) {
      if (request === detailGeneration.current) {
        setPageError(mapError(error, t("policy.errors.loadDetail", { defaultValue: "خطا در بارگذاری جزئیات سیاست." })));
      }
      return null;
    } finally {
      if (request === detailGeneration.current) setBusy(false);
    }
  }, [fetchDetail, mapError, t]);

  useEffect(() => {
    void loadRows();
    return () => {
      listGeneration.current += 1;
      detailGeneration.current += 1;
    };
  }, [loadRows]);

  const selectNode = useCallback((node: CentralPolicyTreeNode) => {
    if (selectedNode?.id === node.id && selectedNode.type === node.type && selectedDetail?.id === node.id) return;
    requestLeave(() => {
      setSelectedNode(node);
      setExpansionAnchorId(node.id);
      setSelectedDetail(null);
      setObjectError(null);
      setDocumentError(null);
      void (async () => {
        const detail = await loadDetail(node);
        if (detail) setSelectedDetail(detail);
      })();
    });
  }, [loadDetail, requestLeave, selectedDetail?.id, selectedNode]);

  const allowedCreateTypes = useMemo<CentralPolicyNodeType[]>(() => {
    if (!selectedNode) return ["GROUP"];
    if (selectedNode.type === "GROUP") return ["GROUP", "POLICY"];
    return selectedNode.parentId ? ["GROUP", "POLICY"] : [];
  }, [selectedNode]);

  const startCreate = useCallback((type: CentralPolicyNodeType) => {
    requestLeave(() => {
      let parentId: string | null = null;
      if (!selectedNode) {
        if (type !== "GROUP") return;
      } else if (selectedNode.type === "GROUP") {
        parentId = selectedNode.id;
      } else {
        parentId = selectedNode.parentId;
        if (!parentId) return;
      }
      if (type === "POLICY" && !parentId) return;
      setModalType(type);
      setModalParentId(parentId);
      setModalValue(null);
      setModalMode("create");
      setActiveTab("general");
      setObjectError(null);
      setDocumentError(null);
      setModalOpen(true);
    });
  }, [requestLeave, selectedNode]);

  const showSelected = useCallback(() => {
    if (!selectedNode || !selectedDetail) return;
    requestLeave(() => {
      setModalType(selectedNode.type);
      setModalParentId(selectedNode.parentId);
      setModalValue(selectedDetail);
      setModalMode("view");
      setActiveTab("general");
      setObjectError(null);
      setDocumentError(null);
      setModalOpen(true);
    });
  }, [requestLeave, selectedDetail, selectedNode]);

  const editSelected = useCallback(() => {
    if (!selectedNode || !selectedDetail) return;
    setModalType(selectedNode.type);
    setModalParentId(selectedNode.parentId);
    setModalValue(selectedDetail);
    setModalMode("edit");
    setActiveTab("general");
    setObjectError(null);
    setDocumentError(null);
    setModalOpen(true);
  }, [selectedDetail, selectedNode]);

  const closeObject = useCallback(() => {
    requestLeave(() => {
      setDirty(false);
      setModalOpen(false);
      setModalValue(null);
      setObjectError(null);
      setDocumentError(null);
      setActiveTab("general");
    });
  }, [requestLeave]);

  const submit = useCallback(async (draft: CentralPolicyObjectDraft) => {
    setBusy(true);
    setObjectError(null);
    setDocumentError(null);
    try {
      let entityId: string;
      if (modalMode === "create") {
        if (modalType === "GROUP") {
          const result = await centralPolicyApi.createGroup({
            code: draft.code,
            title: draft.title,
            parentGroupId: draft.parentId,
            description: draft.description,
            sortOrder: 0,
            validFrom: draft.validFrom,
            validTo: draft.validTo,
            documents: draft.documents,
          });
          entityId = result.entityId;
        } else {
          if (!draft.parentId) throw new Error("PARENT_NOT_FOUND");
          const result = await centralPolicyApi.createPolicy({
            code: draft.code,
            title: draft.title,
            policyGroupId: draft.parentId,
            policyType: draft.policyType,
            responsibleOrganization: draft.responsibleOrganization,
            communicationMethod: draft.communicationMethod,
            nextReviewDate: draft.nextReviewDate,
            objective: draft.objective,
            description: draft.description,
            sortOrder: 0,
            validFrom: draft.validFrom,
            validTo: draft.validTo,
            documents: draft.documents,
          });
          entityId = result.entityId;
        }
      } else {
        const current = modalValue!;
        let version = current.version;
        const currentPolicy = modalType === "POLICY" ? current as CentralPolicyDetail : null;
        const policyMetadataChanged = currentPolicy !== null && (
          currentPolicy.policyType !== draft.policyType ||
          (currentPolicy.responsibleOrganization ?? null) !== draft.responsibleOrganization ||
          (currentPolicy.communicationMethod ?? null) !== draft.communicationMethod ||
          (currentPolicy.nextReviewDate ?? null) !== draft.nextReviewDate ||
          (currentPolicy.objective ?? null) !== draft.objective
        );
        const definitionChanged =
          current.title !== draft.title ||
          policyMetadataChanged ||
          (current.description ?? null) !== draft.description ||
          (current.validFrom ?? null) !== draft.validFrom ||
          (current.validTo ?? null) !== draft.validTo ||
          draft.documentsDirty;
        if (definitionChanged) {
          const result = modalType === "GROUP"
            ? await centralPolicyApi.updateGroup(current.id, {
                version,
                title: draft.title,
                description: draft.description,
                validFrom: draft.validFrom,
                validTo: draft.validTo,
                documents: draft.documents,
              })
            : await centralPolicyApi.updatePolicy(current.id, {
                version,
                title: draft.title,
                policyType: draft.policyType,
                responsibleOrganization: draft.responsibleOrganization,
                communicationMethod: draft.communicationMethod,
                nextReviewDate: draft.nextReviewDate,
                objective: draft.objective,
                description: draft.description,
                validFrom: draft.validFrom,
                validTo: draft.validTo,
                documents: draft.documents,
              });
          version = result.version;
        }

        const currentParentId = detailParentId(modalType, current);
        if (currentParentId !== draft.parentId) {
          if (modalType === "GROUP") {
            const result = await centralPolicyApi.moveGroup(current.id, {
              version,
              parentGroupId: draft.parentId,
              sortOrder: current.sortOrder,
            });
            version = result.version;
          } else {
            if (!draft.parentId) throw new Error("PARENT_NOT_FOUND");
            const result = await centralPolicyApi.movePolicy(current.id, {
              version,
              policyGroupId: draft.parentId,
              sortOrder: current.sortOrder,
            });
            version = result.version;
          }
        }

        if (current.status !== draft.status) {
          const action = draft.status === "ACTIVE" ? "activate" : "inactivate";
          const result = modalType === "GROUP"
            ? await centralPolicyApi.groupLifecycle(current.id, action, version)
            : await centralPolicyApi.policyLifecycle(current.id, action, version);
          version = result.version;
        }
        entityId = current.id;
      }

      setDirty(false);
      await loadRows();
      const detail = await fetchDetail(modalType, entityId);
      const node = detailToNode(modalType, detail);
      setSelectedNode(node);
      setSelectedDetail(detail);
      setExpansionAnchorId(node.parentId ?? node.id);
      setModalValue(detail);
      setModalParentId(node.parentId);
      setModalMode("view");
      return true;
    } catch (error) {
      setDocumentError(toDocumentAggregateDraftError(error));
      setObjectError(mapError(
        error,
        modalMode === "create"
          ? t("policy.errors.create", { defaultValue: "خطا در ایجاد آیتم سیاست." })
          : t("policy.errors.update", { defaultValue: "خطا در بروزرسانی آیتم سیاست." }),
      ));
      return false;
    } finally {
      setBusy(false);
    }
  }, [fetchDetail, loadRows, mapError, modalMode, modalType, modalValue, t]);

  const clearSelection = useCallback(() => {
    requestLeave(() => {
      setSelectedNode(null);
      setSelectedDetail(null);
      setExpansionAnchorId(null);
    });
  }, [requestLeave]);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate || !selectedDetail || deleteCandidate.id !== selectedDetail.id) return;
    setBusy(true);
    try {
      if (deleteCandidate.type === "GROUP") {
        await centralPolicyApi.groupLifecycle(deleteCandidate.id, "delete", selectedDetail.version);
      } else {
        await centralPolicyApi.policyLifecycle(deleteCandidate.id, "delete", selectedDetail.version);
      }
      setDeleteCandidate(null);
      setSelectedNode(null);
      setSelectedDetail(null);
      setExpansionAnchorId(null);
      await loadRows();
    } catch (error) {
      setDeleteCandidate(null);
      setPageError(mapError(error, t("policy.errors.delete", { defaultValue: "خطا در حذف آیتم سیاست." })));
    } finally {
      setBusy(false);
    }
  }, [deleteCandidate, loadRows, mapError, selectedDetail, t]);

  const labelById = useCallback((id: string | null | undefined) => {
    if (!id) return "";
    const row = groups.find((candidate) => candidate.id === id);
    return row ? `${row.code} — ${row.title}` : id;
  }, [groups]);

  const modalCurrentId = modalMode === "create" ? null : modalValue?.id ?? null;
  const modalGroupDescendants = useMemo(
    () => modalType === "GROUP" && modalCurrentId
      ? collectPolicyGroupDescendantIds(groups, modalCurrentId)
      : new Set<string>(),
    [groups, modalCurrentId, modalType],
  );

  const parentCandidates = useMemo<PolicyParentCandidate[]>(() =>
    groups
      .filter((row) => modalType !== "GROUP" || (row.id !== modalCurrentId && !modalGroupDescendants.has(row.id)))
      .map((row) => ({ id: row.id, code: row.code, title: row.title })),
    [groups, modalCurrentId, modalGroupDescendants, modalType],
  );

  const selectedParentLabel = labelById(selectedNode?.parentId);
  const fclLayout: FclLayout = selectedDetail ? "TwoColumnsStartExpanded" : "OneColumn";
  const typeLabel = modalType === "GROUP"
    ? t("policy.nodeType.group", { defaultValue: "گروه سیاست" })
    : t("policy.nodeType.policy", { defaultValue: "سیاست" });
  const dialogTitle = modalMode === "create"
    ? t("policy.dialog.create", { defaultValue: "ایجاد {{type}}", type: typeLabel })
    : modalMode === "edit"
      ? t("policy.dialog.edit", { defaultValue: "ویرایش {{type}}", type: typeLabel })
      : t("policy.dialog.view", { defaultValue: "نمایش {{type}}", type: typeLabel });

  const startColumn = createElement(
    "div",
    { slot: "startColumn", dir: appDir, className: "policyFclColumn" },
    <CentralPolicyListReport
      groups={groups}
      policies={policies}
      selectedId={selectedNode?.id ?? null}
      expansionAnchorId={expansionAnchorId}
      searchText={searchText}
      busy={busy}
      error={!modalOpen ? pageError : null}
      canCreate={permissions.create}
      canDelete={permissions.delete}
      allowedCreateTypes={allowedCreateTypes}
      onErrorClose={() => setPageError(null)}
      onSearchTextChange={setSearchText}
      onCreate={startCreate}
      onShow={showSelected}
      onDelete={() => selectedNode && setDeleteCandidate(selectedNode)}
      onSelect={selectNode}
    />,
  );

  const midColumn = selectedNode && selectedDetail
    ? createElement(
        "div",
        { slot: "midColumn", dir: appDir, className: "policyFclColumn" },
        <CentralPolicySummaryPanel
          node={selectedNode}
          value={selectedDetail}
          parentLabel={selectedParentLabel}
          busy={busy}
          canEdit={permissions.update}
          onEdit={editSelected}
          onCancel={clearSelection}
        />,
      )
    : null;

  const handleDialogClose = useCallback((event: unknown) => {
    if (isOwnDialogCloseEvent(event)) closeObject();
  }, [closeObject]);

  return (
    <>
      {createElement(
        "ui5-flexible-column-layout",
        {
          layout: fclLayout,
          dir: appDir,
          "disable-resizing": true,
          className: "policyFcl",
        },
        startColumn,
        midColumn,
      )}

      <Dialog open={modalOpen} accessibleName={dialogTitle} className="policyObjectDialog" onClose={handleDialogClose}>
        <ModalDialogHeader title={dialogTitle} onClose={closeObject} />
        <div className="policyDialogContent" dir={appDir}>
          {modalMode === "create" || modalValue ? (
            <CentralPolicyObjectPage
              key={`${modalMode === "create" ? "create" : modalValue?.id}:${modalType}:${modalMode}`}
              mode={modalMode}
              nodeType={modalType}
              value={modalMode === "create" ? null : modalValue}
              initialParentId={modalParentId}
              parentCandidates={parentCandidates}
              activeTab={activeTab}
              busy={busy}
              permissions={permissions}
              error={objectError}
              documentError={documentError}
              onErrorClose={() => setObjectError(null)}
              onSubmit={submit}
              onCancel={closeObject}
              onEdit={() => setModalMode("edit")}
              onActiveTabChange={setActiveTab}
              onDirtyChange={setDirty}
            />
          ) : busy ? (
            <BusyIndicator active delay={0} />
          ) : (
            <MessageStrip design="Information" hideCloseButton>
              {t("policy.errors.notFound", { defaultValue: "آیتم موردنظر یافت نشد." })}
            </MessageStrip>
          )}
        </div>
      </Dialog>

      <DeleteConfirmDialog
        open={leaveConfirmationOpen || blocker.state === "blocked"}
        title={t("common.unsavedChanges.title", { defaultValue: "تغییرات ذخیره‌نشده" })}
        message={t("common.unsavedChanges.message", { defaultValue: "تغییرات ذخیره‌نشده نادیده گرفته شود؟" })}
        confirmText={t("common.unsavedChanges.leave", { defaultValue: "خروج" })}
        cancelText={t("common.unsavedChanges.stay", { defaultValue: "ماندن" })}
        loading={false}
        onClose={stay}
        onConfirm={confirmLeave}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteCandidate)}
        title={t("policy.delete.title", { defaultValue: "حذف آیتم سیاست" })}
        message={t("policy.delete.confirm", {
          defaultValue: "آیا از حذف «{{title}}» مطمئن هستید؟",
          title: deleteCandidate?.title ?? "",
        })}
        confirmText={t("common.delete", { defaultValue: "حذف" })}
        cancelText={t("common.cancel", { defaultValue: "انصراف" })}
        loading={busy}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Dialog, MessageStrip } from "@ui5/webcomponents-react";
import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import { useCatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import { toDocumentAggregateDraftError, type DocumentAggregateDraftError } from "@/features/document";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import CentralRegulationListReport from "../components/CentralRegulationListReport";
import CentralRegulationSummaryPanel from "../components/CentralRegulationSummaryPanel";
import type { RegulationParentCandidate } from "../components/RegulationParentValueHelpDialog";
import type {
  CentralRegulationAnyDetail,
  CentralRegulationDetail,
  CentralRegulationGroupDetail,
  CentralRegulationGroupSummary,
  CentralRegulationNodeType,
  CentralRegulationRequirementDetail,
  CentralRegulationRequirementSummary,
  CentralRegulationSummary,
} from "../domain/centralRegulation.model";
import { centralRegulationApi } from "../infra/centralRegulation.api";
import {
  collectRegulationGroupDescendantIds,
  type CentralRegulationTreeNode,
} from "../utils/centralRegulation.tree";
import CentralRegulationObjectPage, {
  type CentralRegulationObjectDraft,
  type CentralRegulationObjectMode,
  type CentralRegulationTabKey,
} from "./CentralRegulationObjectPage";
import "../regulation.css";

type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

function resolveUiDir(): UiDir {
  if (typeof document === "undefined") return "rtl";
  const htmlDir = document.documentElement.getAttribute("dir");
  if (htmlDir === "rtl" || htmlDir === "ltr") return htmlDir;
  const bodyDir = document.body?.getAttribute("dir") ?? document.body?.dir;
  return bodyDir === "ltr" ? "ltr" : "rtl";
}

function useResolvedUiDir(): UiDir {
  const [dir, setDir] = useState<UiDir>(() => resolveUiDir());
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setDir(resolveUiDir());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ["dir"] });
    }
    return () => observer.disconnect();
  }, []);
  return dir;
}

function isOwnDialogCloseEvent(event: unknown) {
  const candidate = event as {
    target?: EventTarget | null;
    currentTarget?: EventTarget | null;
  };
  return Boolean(
    candidate.target &&
      candidate.currentTarget &&
      candidate.target === candidate.currentTarget,
  );
}

function detailParentId(
  type: CentralRegulationNodeType,
  value: CentralRegulationAnyDetail,
): string | null {
  return type === "GROUP"
    ? (value as CentralRegulationGroupDetail).parentGroupId
    : type === "REGULATION"
      ? (value as CentralRegulationDetail).regulationGroupId
      : (value as CentralRegulationRequirementDetail).regulationId;
}

function detailToNode(
  type: CentralRegulationNodeType,
  value: CentralRegulationAnyDetail,
): CentralRegulationTreeNode {
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

export default function CentralRegulationsPage() {
  const { t } = useTranslation();
  const appDir = useResolvedUiDir();
  const permissions = useCatalogActionPermissions("CENTRAL_REGULATION");
  const [groups, setGroups] = useState<CentralRegulationGroupSummary[]>([]);
  const [regulations, setRegulations] = useState<CentralRegulationSummary[]>([]);
  const [requirements, setRequirements] = useState<CentralRegulationRequirementSummary[]>([]);
  const [selectedNode, setSelectedNode] = useState<CentralRegulationTreeNode | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CentralRegulationAnyDetail | null>(null);
  const [searchText, setSearchText] = useState("");
  const [expansionAnchorId, setExpansionAnchorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<DocumentAggregateDraftError | null>(null);
  const [dirty, setDirty] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<CentralRegulationObjectMode>("view");
  const [modalType, setModalType] = useState<CentralRegulationNodeType>("GROUP");
  const [modalValue, setModalValue] = useState<CentralRegulationAnyDetail | null>(null);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CentralRegulationTabKey>("general");
  const [deleteCandidate, setDeleteCandidate] = useState<CentralRegulationTreeNode | null>(null);
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const pendingLeaveActionRef = useRef<(() => void) | null>(null);
  const { blocker } = useUnsavedChangesGuard(dirty);

  const mapError = useCallback(
    (error: unknown, fallbackKey: string) => {
      const candidate = error as { code?: string; message?: string } | null;
      const code = candidate?.code ?? candidate?.message;
      switch (code) {
        case "DUPLICATE_BUSINESS_KEY":
          return t("regulation.errors.duplicateCode");
        case "MASTER_DATA_NOT_FOUND":
        case "NOT_FOUND":
        case "PARENT_NOT_FOUND":
          return t("regulation.errors.notFound");
        case "VERSION_CONFLICT":
          return t("regulation.errors.versionConflict");
        case "INVALID_PARENT":
        case "INVALID_HIERARCHY_MOVE":
        case "HIERARCHY_CYCLE":
        case "HIERARCHY_SELF_PARENT":
          return t("regulation.errors.invalidParent");
        case "DEPENDENCY_EXISTS":
          return t("regulation.errors.dependencies");
        default:
          return t(fallbackKey);
      }
    },
    [t],
  );

  const requestLeave = useCallback(
    (action: () => void) => {
      if (!dirty) {
        action();
        return;
      }
      pendingLeaveActionRef.current = action;
      setLeaveConfirmationOpen(true);
    },
    [dirty],
  );

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
      const [nextGroups, nextRegulations, nextRequirements] = await Promise.all([
        centralRegulationApi.listGroups(),
        centralRegulationApi.listRegulations(),
        centralRegulationApi.listRequirements(),
      ]);
      if (request !== listGeneration.current) return false;
      setGroups(nextGroups);
      setRegulations(nextRegulations);
      setRequirements(nextRequirements);
      setPageError(null);
      return true;
    } catch (error) {
      if (request === listGeneration.current) {
        setPageError(mapError(error, "regulation.errors.loadList"));
      }
      return false;
    } finally {
      if (request === listGeneration.current) setBusy(false);
    }
  }, [mapError]);

  const fetchDetail = useCallback(
    async (type: CentralRegulationNodeType, id: string) => {
      switch (type) {
        case "GROUP":
          return centralRegulationApi.group(id);
        case "REGULATION":
          return centralRegulationApi.regulation(id);
        case "REQUIREMENT":
          return centralRegulationApi.requirement(id);
      }
    },
    [],
  );

  const loadDetail = useCallback(
    async (node: CentralRegulationTreeNode) => {
      const request = ++detailGeneration.current;
      setBusy(true);
      try {
        const detail = await fetchDetail(node.type, node.id);
        if (request !== detailGeneration.current) return null;
        setPageError(null);
        return detail;
      } catch (error) {
        if (request === detailGeneration.current) {
          setPageError(mapError(error, "regulation.errors.loadDetail"));
        }
        return null;
      } finally {
        if (request === detailGeneration.current) setBusy(false);
      }
    },
    [fetchDetail, mapError],
  );

  useEffect(() => {
    void loadRows();
    return () => {
      listGeneration.current += 1;
      detailGeneration.current += 1;
    };
  }, [loadRows]);

  const selectNode = useCallback(
    (node: CentralRegulationTreeNode) => {
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
    },
    [loadDetail, requestLeave],
  );

  const allowedCreateTypes = useMemo<CentralRegulationNodeType[]>(() => {
    if (!selectedNode) return ["GROUP"];
    if (selectedNode.type === "GROUP") return ["GROUP", "REGULATION"];
    if (selectedNode.type === "REGULATION") return ["REQUIREMENT"];
    return [];
  }, [selectedNode]);

  const startCreate = useCallback(
    (type: CentralRegulationNodeType) => {
      requestLeave(() => {
        let parentId: string | null = null;
        if (type === "GROUP") {
          parentId = selectedNode?.type === "GROUP" ? selectedNode.id : null;
        } else if (type === "REGULATION") {
          if (selectedNode?.type !== "GROUP") return;
          parentId = selectedNode.id;
        } else {
          if (selectedNode?.type !== "REGULATION") return;
          parentId = selectedNode.id;
        }
        setModalType(type);
        setModalParentId(parentId);
        setModalValue(null);
        setModalMode("create");
        setActiveTab("general");
        setObjectError(null);
        setDocumentError(null);
        setModalOpen(true);
      });
    },
    [requestLeave, selectedNode],
  );

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

  const submit = useCallback(
    async (draft: CentralRegulationObjectDraft) => {
      setBusy(true);
      setObjectError(null);
      setDocumentError(null);
      try {
        let entityId: string;
        if (modalMode === "create") {
          if (modalType === "GROUP") {
            const result = await centralRegulationApi.createGroup({
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
          } else if (modalType === "REGULATION") {
            if (!draft.parentId) throw new Error("PARENT_NOT_FOUND");
            const result = await centralRegulationApi.createRegulation({
              code: draft.code,
              title: draft.title,
              regulationGroupId: draft.parentId,
              description: draft.description,
              sortOrder: 0,
              validFrom: draft.validFrom,
              validTo: draft.validTo,
              documents: draft.documents,
            });
            entityId = result.entityId;
          } else {
            if (!draft.parentId) throw new Error("PARENT_NOT_FOUND");
            const result = await centralRegulationApi.createRequirement({
              code: draft.code,
              title: draft.title,
              regulationId: draft.parentId,
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
          const definitionChanged =
            current.title !== draft.title ||
            (current.description ?? null) !== draft.description ||
            (current.validFrom ?? null) !== draft.validFrom ||
            (current.validTo ?? null) !== draft.validTo ||
            draft.documentsDirty;
          if (definitionChanged) {
            const command = {
              version,
              title: draft.title,
              description: draft.description,
              validFrom: draft.validFrom,
              validTo: draft.validTo,
              documents: draft.documents,
            };
            const result =
              modalType === "GROUP"
                ? await centralRegulationApi.updateGroup(current.id, command)
                : modalType === "REGULATION"
                  ? await centralRegulationApi.updateRegulation(current.id, command)
                  : await centralRegulationApi.updateRequirement(current.id, command);
            version = result.version;
          }

          const currentParentId = detailParentId(modalType, current);
          if (currentParentId !== draft.parentId) {
            let result;
            if (modalType === "GROUP") {
              result = await centralRegulationApi.moveGroup(current.id, {
                version,
                parentGroupId: draft.parentId,
                sortOrder: current.sortOrder,
              });
            } else if (modalType === "REGULATION") {
              if (!draft.parentId) throw new Error("PARENT_NOT_FOUND");
              result = await centralRegulationApi.moveRegulation(current.id, {
                version,
                regulationGroupId: draft.parentId,
                sortOrder: current.sortOrder,
              });
            } else {
              if (!draft.parentId) throw new Error("PARENT_NOT_FOUND");
              result = await centralRegulationApi.moveRequirement(current.id, {
                version,
                regulationId: draft.parentId,
                sortOrder: current.sortOrder,
              });
            }
            version = result.version;
          }

          if (current.status !== draft.status) {
            const action = draft.status === "ACTIVE" ? "activate" : "inactivate";
            const result =
              modalType === "GROUP"
                ? await centralRegulationApi.groupLifecycle(current.id, action, version)
                : modalType === "REGULATION"
                  ? await centralRegulationApi.regulationLifecycle(current.id, action, version)
                  : await centralRegulationApi.requirementLifecycle(current.id, action, version);
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
        setObjectError(
          mapError(
            error,
            modalMode === "create"
              ? "regulation.errors.create"
              : "regulation.errors.update",
          ),
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [fetchDetail, loadRows, mapError, modalMode, modalType, modalValue],
  );

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
        await centralRegulationApi.groupLifecycle(
          deleteCandidate.id,
          "delete",
          selectedDetail.version,
        );
      } else if (deleteCandidate.type === "REGULATION") {
        await centralRegulationApi.regulationLifecycle(
          deleteCandidate.id,
          "delete",
          selectedDetail.version,
        );
      } else {
        await centralRegulationApi.requirementLifecycle(
          deleteCandidate.id,
          "delete",
          selectedDetail.version,
        );
      }
      setDeleteCandidate(null);
      setSelectedNode(null);
      setSelectedDetail(null);
      setExpansionAnchorId(null);
      await loadRows();
    } catch (error) {
      setDeleteCandidate(null);
      setPageError(mapError(error, "regulation.errors.delete"));
    } finally {
      setBusy(false);
    }
  }, [deleteCandidate, loadRows, mapError, selectedDetail]);

  const labelById = useCallback(
    (id: string | null | undefined) => {
      if (!id) return "";
      const row = [...groups, ...regulations].find((candidate) => candidate.id === id);
      return row ? `${row.code} — ${row.title}` : id;
    },
    [groups, regulations],
  );

  const modalCurrentId = modalMode === "create" ? null : modalValue?.id ?? null;
  const modalGroupDescendants = useMemo(
    () =>
      modalType === "GROUP" && modalCurrentId
        ? collectRegulationGroupDescendantIds(groups, modalCurrentId)
        : new Set<string>(),
    [groups, modalCurrentId, modalType],
  );

  const parentCandidates = useMemo<RegulationParentCandidate[]>(() => {
    if (modalType === "GROUP") {
      return groups
        .filter(
          (row) =>
            row.id !== modalCurrentId && !modalGroupDescendants.has(row.id),
        )
        .map((row) => ({ id: row.id, code: row.code, title: row.title }));
    }
    if (modalType === "REGULATION") {
      return groups.map((row) => ({ id: row.id, code: row.code, title: row.title }));
    }
    return regulations.map((row) => ({ id: row.id, code: row.code, title: row.title }));
  }, [groups, modalCurrentId, modalGroupDescendants, modalType, regulations]);

  const selectedParentLabel = labelById(selectedNode?.parentId);
  const fclLayout: FclLayout = selectedDetail ? "TwoColumnsStartExpanded" : "OneColumn";
  const typeKey =
    modalType === "GROUP"
      ? "group"
      : modalType === "REGULATION"
        ? "regulation"
        : "requirement";
  const typeLabel = t(`regulation.nodeType.${typeKey}`);
  const dialogTitle = t(`regulation.dialog.${modalMode}`, { type: typeLabel });

  const startColumn = createElement(
    "div",
    { slot: "startColumn", dir: appDir, className: "regulationFclColumn" },
    <CentralRegulationListReport
      groups={groups}
      regulations={regulations}
      requirements={requirements}
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

  const midColumn =
    selectedNode && selectedDetail
      ? createElement(
          "div",
          { slot: "midColumn", dir: appDir, className: "regulationFclColumn" },
          <CentralRegulationSummaryPanel
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

  const handleDialogClose = useCallback(
    (event: unknown) => {
      if (isOwnDialogCloseEvent(event)) closeObject();
    },
    [closeObject],
  );

  return (
    <>
      {createElement(
        "ui5-flexible-column-layout",
        {
          layout: fclLayout,
          dir: appDir,
          "disable-resizing": true,
          className: "regulationFcl",
        },
        startColumn,
        midColumn,
      )}

      <Dialog
        open={modalOpen}
        accessibleName={dialogTitle}
        className="regulationObjectDialog"
        onClose={handleDialogClose}
      >
        <ModalDialogHeader title={dialogTitle} onClose={closeObject} />
        <div className="regulationDialogContent" dir={appDir}>
          {modalMode === "create" || modalValue ? (
            <CentralRegulationObjectPage
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
              {t("regulation.errors.notFound")}
            </MessageStrip>
          )}
        </div>
      </Dialog>

      <DeleteConfirmDialog
        open={leaveConfirmationOpen || blocker.state === "blocked"}
        title={t("common.unsavedChanges.title", { defaultValue: "تغییرات ذخیره‌نشده" })}
        message={t("common.unsavedChanges.message", {
          defaultValue: "تغییرات ذخیره‌نشده نادیده گرفته شود؟",
        })}
        confirmText={t("common.unsavedChanges.leave", { defaultValue: "خروج" })}
        cancelText={t("common.unsavedChanges.stay", { defaultValue: "ماندن" })}
        loading={false}
        onClose={stay}
        onConfirm={confirmLeave}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteCandidate)}
        title={t("regulation.delete.title")}
        message={t("regulation.delete.confirm", {
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

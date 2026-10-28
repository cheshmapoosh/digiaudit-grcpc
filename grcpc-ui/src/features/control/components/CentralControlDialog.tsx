import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Dialog, MessageStrip } from "@ui5/webcomponents-react";
import { useCatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import { toDocumentAggregateDraftError, type DocumentAggregateDraftError } from "@/features/document";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { useDialogOpenAfterRender } from "@/shared/hooks/useDialogOpenAfterRender";
import CentralControlObjectPage, { type CentralControlObjectMode, type CentralControlTabKey } from "../pages/CentralControlObjectPage";
import type { CentralControlDetail, CentralControlGroupSummary, CreateCentralControlCommand, UpdateCentralControlCommand } from "../domain/centralControl.model";
import { centralControlApi } from "../infra/centralControl.api.repo";
import "../control.css";

interface Props {
  controlId: string | null;
  initialSubprocess?: { subprocessId: string; version: number };
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => Promise<void>;
  onRefreshFailed: () => void;
}

/** Reuses the catalog editor, including Documents and all owner-local drafts. */
export default function CentralControlDialog({ controlId, initialSubprocess, onClose, onDirtyChange, onSaved, onRefreshFailed }: Props) {
  const { t } = useTranslation();
  const permissions = useCatalogActionPermissions("CENTRAL_CONTROL");
  const open = useDialogOpenAfterRender();
  const [mode, setMode] = useState<CentralControlObjectMode>(controlId ? "view" : "create");
  const [value, setValue] = useState<CentralControlDetail | null>(null);
  const [groups, setGroups] = useState<CentralControlGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<DocumentAggregateDraftError | null>(null);
  const [activeTab, setActiveTab] = useState<CentralControlTabKey>("general");

  useEffect(() => {
    let active = true;
    void Promise.all([centralControlApi.listGroups(), controlId ? centralControlApi.detail(controlId) : Promise.resolve(null)])
      .then(([nextGroups, detail]) => {
        if (!active) return;
        setGroups(nextGroups); setValue(detail); setLoaded(true); setLoading(false);
      }).catch(() => {
        if (active) { setError(t("control.errors.loadDetail")); setLoading(false); }
      });
    return () => { active = false; };
  }, [controlId, t]);

  const submit = async (payload: CreateCentralControlCommand | UpdateCentralControlCommand) => {
    if (saving || (mode === "edit" && !value)) return false;
    setSaving(true); setError(null); setDocumentError(null);
    try {
      const result = mode === "create"
        ? await centralControlApi.create({ ...payload as CreateCentralControlCommand, initialSubprocess })
        : await centralControlApi.update(value!.id, payload as UpdateCentralControlCommand);
      onDirtyChange(false);
      try {
        const [detail] = await Promise.all([centralControlApi.detail(result.entityId), onSaved()]);
        setValue(detail); setMode("view");
      } catch {
        // Saving succeeded: never leave a submitted Create draft available for a second Save.
        onRefreshFailed();
      }
      return true;
    } catch (failure) {
      const code = (failure as { code?: string })?.code;
      const keys: Record<string, string> = {
        VERSION_CONFLICT: "control.errors.versionConflict", INVALID_PARENT: "control.errors.invalidParent",
        DUPLICATE_BUSINESS_KEY: "control.errors.duplicateCode", DUPLICATE_RELATION: "controlScope.errors.duplicate",
        CONTROL_SCOPE_ENDPOINT_NOT_ACTIVE: "controlScope.errors.endpointInactive",
        CONTROL_SCOPE_VALIDITY_OUTSIDE_ENDPOINTS: "controlScope.errors.validityOutsideEndpoints",
        DATE_RANGE_INVALID: "process.errors.controlValidityDisjoint",
        SUBPROCESS_NOT_FOUND: "process.errors.notFound", CONTROL_SCOPE_ENDPOINT_NOT_FOUND: "controlScope.errors.notFound",
        FORBIDDEN: "controlScope.errors.forbidden",
        HIERARCHY_BUSY: "process.errors.hierarchyBusy",
      };
      setDocumentError(toDocumentAggregateDraftError(failure));
      setError(t(keys[code ?? ""] ?? (mode === "create" ? "control.errors.create" : "control.errors.update")));
      return false;
    } finally { setSaving(false); }
  };
  const close = () => { if (!saving) onClose(); };
  const title = t(`control.${mode}.title`);

  return <Dialog open={open} accessibleName={title} className="controlObjectDialog" onClose={event => {
    if (event.target === event.currentTarget) close();
  }}>
    <ModalDialogHeader title={title} onClose={close} />
    <div className="controlDialogContent">
      {loading ? <BusyIndicator active /> : !loaded ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> :
        <CentralControlObjectPage key={`${mode}:${value?.id ?? "new"}`} mode={mode} value={value}
          initialControlGroupId={null} groups={groups} activeTab={activeTab} busy={saving}
          permissions={permissions} error={error} documentError={documentError}
          onErrorClose={() => setError(null)} onSubmit={submit} onCancel={close}
          onEdit={() => { onDirtyChange(false); setMode("edit"); }} onActiveTabChange={setActiveTab}
          onDirtyChange={onDirtyChange} />}
    </div>
  </Dialog>;
}

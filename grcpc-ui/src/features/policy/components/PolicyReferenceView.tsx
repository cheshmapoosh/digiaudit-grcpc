import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Dialog, MessageStrip } from "@ui5/webcomponents-react";
import type { CatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import type { ProcessNode } from "@/features/process/domain/process.model";
import { ProcessApiRepo } from "@/features/process/infra/process.api.repo";
import ProcessObjectPage, { type ProcessTabKey } from "@/features/process/pages/ProcessObjectPage";
import type { OrganizationNode } from "@/features/organization/domain/organization.model";
import { OrganizationApiRepo } from "@/features/organization/infra/organization.api.repo";
import OrganizationObjectPage, { type OrganizationTabKey } from "@/features/organization/pages/OrganizationObjectPage";
import type { CentralControlDetail, CentralControlGroupSummary } from "@/features/control/domain/centralControl.model";
import { centralControlApi } from "@/features/control/infra/centralControl.api.repo";
import CentralControlObjectPage, { type CentralControlTabKey } from "@/features/control/pages/CentralControlObjectPage";
import type { CentralRegulationRequirementDetail, CentralRegulationSummary } from "@/features/regulation/domain/centralRegulation.model";
import { centralRegulationApi } from "@/features/regulation/infra/centralRegulation.api";
import CentralRegulationObjectPage, { type CentralRegulationTabKey } from "@/features/regulation/pages/CentralRegulationObjectPage";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import type { PolicyRelationKind } from "./PolicyRelationTab";
import "@/features/control/control.css";
import "@/features/regulation/regulation.css";

type ReferenceData =
  | { kind: "subprocess"; item: ProcessNode; items: ProcessNode[] }
  | { kind: "organization"; item: OrganizationNode; items: OrganizationNode[] }
  | { kind: "control"; item: CentralControlDetail; groups: CentralControlGroupSummary[] }
  | { kind: "requirement"; item: CentralRegulationRequirementDetail; regulations: CentralRegulationSummary[] };

const READ_ONLY_PERMISSIONS: CatalogActionPermissions = {
  create: false, update: false, move: false, lifecycle: false, delete: false,
  restore: false, publish: false, documentUpload: false,
};
const processApi = new ProcessApiRepo();
const organizationApi = new OrganizationApiRepo();

function isOwnClose(event: unknown) {
  const candidate = event as { target?: EventTarget | null; currentTarget?: EventTarget | null };
  return Boolean(candidate.target && candidate.target === candidate.currentTarget);
}

export default function PolicyReferenceView({ kind, objectId, onClose }: {
  kind: PolicyRelationKind; objectId: string; onClose: () => void;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<ReferenceData | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<string>("general");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let result: ReferenceData;
        if (kind === "subprocess") {
          const [item, items] = await Promise.all([processApi.getById(objectId, "SUBPROCESS"), processApi.list()]);
          if (!item) throw new Error("REFERENCE_NOT_FOUND");
          result = { kind, item, items };
        } else if (kind === "organization") {
          const [item, items] = await Promise.all([organizationApi.getById(objectId), organizationApi.list()]);
          if (!item) throw new Error("REFERENCE_NOT_FOUND");
          result = { kind, item, items };
        } else if (kind === "control") {
          const [item, groups] = await Promise.all([centralControlApi.detail(objectId), centralControlApi.listGroups()]);
          result = { kind, item, groups };
        } else {
          const [item, regulations] = await Promise.all([centralRegulationApi.requirement(objectId), centralRegulationApi.listRegulations()]);
          result = { kind, item, regulations };
        }
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [kind, objectId]);

  return <Dialog open accessibleName={t("policy.relations.reference")}
    onClose={event => { if (isOwnClose(event)) onClose(); }}>
    <ModalDialogHeader title={t("policy.relations.reference")} onClose={onClose} />
    {!data && !error ? <BusyIndicator active delay={0} /> : null}
    {error ? <MessageStrip design="Negative" hideCloseButton>{t("policy.relations.loadError")}</MessageStrip> : null}
    {data?.kind === "subprocess" ? <ProcessObjectPage mode="view" value={data.item} allItems={data.items}
      parent={data.items.find(item => item.id === data.item.parentId) ?? null}
      activeTab={tab as ProcessTabKey} busy={false} error={null} documentAggregateError={null}
      onSubmit={async () => false} onCancel={onClose} onActiveTabChange={setTab} onDirtyChange={() => undefined} /> : null}
    {data?.kind === "organization" ? <OrganizationObjectPage mode="view" value={data.item} allItems={data.items}
      activeTab={tab as OrganizationTabKey} busy={false} error={null} documentAggregateError={null}
      onSubmit={async () => false} onCancel={onClose} onActiveTabChange={setTab} onDirtyChange={() => undefined} /> : null}
    {data?.kind === "control" ? <CentralControlObjectPage mode="view" value={data.item}
      initialControlGroupId={data.item.controlGroupId} groups={data.groups}
      activeTab={tab as CentralControlTabKey} busy={false} permissions={READ_ONLY_PERMISSIONS}
      error={null} documentError={null} onErrorClose={() => undefined}
      onSubmit={async () => false} onCancel={onClose} onEdit={() => undefined}
      onActiveTabChange={setTab} onDirtyChange={() => undefined} /> : null}
    {data?.kind === "requirement" ? <CentralRegulationObjectPage mode="view" nodeType="REQUIREMENT"
      value={data.item} initialParentId={data.item.regulationId} parentCandidates={data.regulations}
      activeTab={tab as CentralRegulationTabKey} busy={false} permissions={READ_ONLY_PERMISSIONS}
      error={null} documentError={null} onErrorClose={() => undefined}
      onSubmit={async () => false} onCancel={onClose} onEdit={() => undefined}
      onActiveTabChange={setTab} onDirtyChange={() => undefined} /> : null}
  </Dialog>;
}

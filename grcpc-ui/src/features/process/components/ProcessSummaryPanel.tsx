import { useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, Label, MessageStrip, Tab, Title } from "@ui5/webcomponents-react";

import { DocumentManager, type DocumentLinkTargetType } from "@/features/document";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type { ProcessNode, ProcessNodeType, ProcessStatus } from "../domain/process.model";

export interface ProcessSummaryPanelProps {
    value?: ProcessNode | null;
    allItems?: ProcessNode[];
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onEdit?: (id: string) => void;
    onClose: () => void;
}

type ProcessDetailTabKey = "general" | "documents";
const ACTION_STYLE: CSSProperties = { minWidth: "8rem" };
const BODY_STYLE: CSSProperties = { minHeight: "18rem", padding: "1rem", border: "1px solid var(--sapGroup_ContentBorderColor)", background: "var(--sapGroup_ContentBackground)" };
const ROW_STYLE: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(7rem, max-content) minmax(0, 1fr)", gap: "0.5rem", alignItems: "start" };

function typeLabel(type: ProcessNodeType, t: ReturnType<typeof useTranslation>["t"]) { return type === "PROCESS" ? t("process.nodeType.process", { defaultValue: "Process" }) : t("process.nodeType.subProcess", { defaultValue: "Subprocess" }); }
function statusLabel(status: ProcessStatus, t: ReturnType<typeof useTranslation>["t"]) { return status === "ACTIVE" ? t("common.active", { defaultValue: "Active" }) : status === "INACTIVE" ? t("common.inactive", { defaultValue: "Inactive" }) : t("common.deleted", { defaultValue: "Deleted" }); }
function documentTarget(type: ProcessNodeType): DocumentLinkTargetType { return type === "PROCESS" ? "CENTRAL_PROCESS" : "CENTRAL_SUBPROCESS"; }
function DetailRow({ label, value }: { label: string; value?: ReactNode }) { return <div style={ROW_STYLE}><Label showColon wrappingType="None">{label}</Label><span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.7 }}>{value || "-"}</span></div>; }

export default function ProcessSummaryPanel({ value, allItems = [], busy = false, error, onErrorClose, onEdit, onClose }: ProcessSummaryPanelProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<ProcessDetailTabKey>("general");
    const parent = value?.parentId ? allItems.find((item) => item.id === value.parentId) : null;
    return <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", minHeight: "100%", gap: "1rem", minWidth: 0 }}>
        <Bar startContent={<Title level="H4">{value?.title ?? t("process.object.summaryTitle", { defaultValue: "Process details" })}</Title>} />
        <div style={{ display: "grid", gap: "1rem", alignContent: "start", minWidth: 0 }}>
            {error ? <MessageStrip design="Negative" onClose={onErrorClose}>{error}</MessageStrip> : null}
            {value ? <div>
                <DetailTabContainer onTabSelect={(event) => { const key = event.detail.tab.getAttribute("data-tab-key") as ProcessDetailTabKey | null; if (key) setActiveTab(key); }}>
                    <Tab text={t("process.tabs.general", { defaultValue: "General Information" })} selected={activeTab === "general"} data-tab-key="general" />
                    <Tab text={t("process.tabs.documents", { defaultValue: "Documents" })} selected={activeTab === "documents"} data-tab-key="documents" />
                </DetailTabContainer>
                <div style={BODY_STYLE}>
                    {activeTab === "general" ? <div style={{ display: "grid", gap: "0.75rem" }}>
                        <DetailRow label={t("process.fields.code", { defaultValue: "Code" })} value={value.code} />
                        <DetailRow label={t("process.fields.name", { defaultValue: "Title" })} value={value.title} />
                        <DetailRow label={t("process.fields.nodeType", { defaultValue: "Node type" })} value={typeLabel(value.nodeType, t)} />
                        <DetailRow label={value.nodeType === "PROCESS" ? t("process.fields.parentProcess", { defaultValue: "Parent process" }) : t("process.fields.owningProcess", { defaultValue: "Owning process" })} value={parent ? `${parent.code} - ${parent.title}` : "-"} />
                        <DetailRow label={t("process.fields.sortOrder", { defaultValue: "Sort order" })} value={String(value.sortOrder)} />
                        <DetailRow label={t("process.fields.status", { defaultValue: "Status" })} value={statusLabel(value.status, t)} />
                        <DetailRow label={t("process.fields.validity", { defaultValue: "Validity" })} value={`${formatPersianDate(value.validFrom)} - ${formatPersianDate(value.validTo)}`} />
                        <DetailRow label={t("process.fields.description", { defaultValue: "Description" })} value={value.description} />
                        <DetailRow label={t("process.fields.createdAt", { defaultValue: "Created at" })} value={formatPersianDateTime(value.createdAt)} />
                        <DetailRow label={t("process.fields.updatedAt")} value={formatPersianDateTime(value.updatedAt)} />
                    </div> : <DocumentManager title={t("process.tabs.documents", { defaultValue: "Documents" })} targetType={documentTarget(value.nodeType)} targetId={value.id} readOnly showActions={false} />}
                </div>
            </div> : <MessageStrip design="Information" hideCloseButton>{t("process.object.selectPrompt", { defaultValue: "Select an item to view details." })}</MessageStrip>}
        </div>
        <Bar endContent={<><Button design="Emphasized" disabled={!value || busy} style={ACTION_STYLE} onClick={() => value && onEdit?.(value.id)}>{t("common.edit", { defaultValue: "Edit" })}</Button><Button design="Transparent" disabled={busy} style={ACTION_STYLE} onClick={onClose}>{t("common.close", { defaultValue: "Close" })}</Button></>} />
    </div>;
}

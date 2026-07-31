import {
    Fragment,
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
import { addCustomCSS } from "@ui5/webcomponents-base/dist/Theming.js";
import { useTranslation } from "react-i18next";
import {
    Bar,
    BusyIndicator,
    Button,
    Label,
    MessageStrip,
    Tab,
    TabSeparator,
    Title,
} from "@ui5/webcomponents-react";

import { DetailTabContainer } from "@/shared/components/DetailTabContainer";

import type {
    RegulationNode,
    RegulationNodeType,
    RegulationStatus,
} from "../domain/regulation.model";
import { regulationService } from "../service/regulation.service";
import { formatPersianDate } from "@/shared/utils/date.utils";
import { DocumentIntegrationDeferredMessage } from "@/features/document";
import RegulationRequirementsSummaryTab from "./tabs/RegulationRequirementsSummaryTab";

export interface RegulationSummaryPanelProps {
    value?: RegulationNode | null;
    onClose: () => void;
}

type RegulationDetailTabKey = "general" | "requirements" | "documents";
type DetailLoadStatus = "idle" | "loading" | "success" | "error";

interface DetailTabDefinition {
    key: RegulationDetailTabKey;
    label: string;
}

interface DetailLoadState {
    status: DetailLoadStatus;
    details: RegulationNode | null;
    error: string | null;
}

const REGULATION_SUMMARY_TAB_CLASS = "regulationSummaryTabs";

addCustomCSS(
    "ui5-tabcontainer",
    `
:host(.${REGULATION_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${REGULATION_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${REGULATION_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus:not([data-moving]) .ui5-tab-strip-itemText::before,
:host(.${REGULATION_SUMMARY_TAB_CLASS}) .ui5-tab-strip-item--inline.ui5-tab-strip-item--textOnly:focus-visible:not([data-moving]) .ui5-tab-strip-itemText::before {
    content: none;
    display: none;
    border: 0;
}`,
);

const ACTION_BUTTON_STYLE: CSSProperties = {
    minWidth: "8rem",
};

const TAB_CONTAINER_STYLE: CSSProperties = {
    borderInline: "1px solid var(--sapGroup_ContentBorderColor)",
    borderTop: "1px solid var(--sapGroup_ContentBorderColor)",
    background: "var(--sapBackgroundColor)",
};

const TAB_BODY_STYLE: CSSProperties = {
    minHeight: "18rem",
    padding: "1rem",
    borderInline: "1px solid var(--sapGroup_ContentBorderColor)",
    borderBottom: "1px solid var(--sapGroup_ContentBorderColor)",
    background: "var(--sapGroup_ContentBackground)",
};

const FIELD_GRID_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(7rem, max-content) minmax(0, 1fr)",
    gap: "0.5rem",
    alignItems: "start",
    minWidth: 0,
};

const HEADER_GRID_STYLE: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
    gap: "0.75rem 1rem",
    padding: "0.75rem 1rem",
    border: "1px solid var(--sapGroup_ContentBorderColor)",
    borderBottom: "none",
    background: "var(--sapGroup_ContentBackground)",
};

const LOADING_STYLE: CSSProperties = {
    display: "grid",
    minHeight: "12rem",
    placeItems: "center",
};

function createInitialLoadState(value?: RegulationNode | null): DetailLoadState {
    return value
        ? {
              status: "loading",
              details: null,
              error: null,
          }
        : {
              status: "idle",
              details: null,
              error: null,
          };
}

function readSelectedTabKey(event: unknown): RegulationDetailTabKey | null {
    const selectedTab = (event as {
        detail?: {
            tab?: HTMLElement;
        };
    }).detail?.tab;

    return selectedTab?.getAttribute("data-tab-key") as RegulationDetailTabKey | null;
}

function resolveNodeTypeLabel(
    nodeType: RegulationNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const labels: Record<RegulationNodeType, string> = {
        lawGroup: t("regulation.nodeType.lawGroup", { defaultValue: "Ú¯Ø±ÙˆÙ‡ Ù‚Ø§Ù†ÙˆÙ†" }),
        law: t("regulation.nodeType.law", { defaultValue: "Ù‚Ø§Ù†ÙˆÙ†" }),
        lawRequirement: t("regulation.nodeType.lawRequirement", {
            defaultValue: "Ø§Ù„Ø²Ø§Ù…Ø§Øª Ù‚Ø§Ù†ÙˆÙ†",
        }),
    };

    return labels[nodeType];
}

function resolveStatusLabel(
    status: RegulationStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    return status === "active"
        ? t("common.active", { defaultValue: "ÙØ¹Ø§Ù„" })
        : t("common.inactive", { defaultValue: "ØºÛŒØ±ÙØ¹Ø§Ù„" });
}

function displayText(value?: string | number | null): string {
    if (typeof value === "number") {
        return String(value);
    }

    return value?.trim() ? value : "-";
}

function displayDate(value?: string | null): string {
    return value ? formatPersianDate(value) : "-";
}

function mapLoadError(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
    return (
        <div style={FIELD_GRID_STYLE}>
            <Label showColon wrappingType="None">
                {label}
            </Label>
            <span
                style={{
                    minWidth: 0,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    lineHeight: 1.7,
                }}
            >
                {value || "-"}
            </span>
        </div>
    );
}

function getTabs(
    nodeType: RegulationNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): DetailTabDefinition[] {
    const tabs: DetailTabDefinition[] = [
        {
            key: "general",
            label: t("regulation.tabs.general", { defaultValue: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ù„ÛŒ" }),
        },
    ];

    if (nodeType === "law") {
        tabs.push({
            key: "requirements",
            label: t("regulation.tabs.requirements", { defaultValue: "Ø§Ù„Ø²Ø§Ù…Ø§Øª" }),
        });
    }

    tabs.push({
        key: "documents",
        label: t("regulation.tabs.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" }),
    });

    return tabs;
}

function RegulationTabs({
    tabs,
    activeTab,
    onChange,
}: {
    tabs: DetailTabDefinition[];
    activeTab: RegulationDetailTabKey;
    onChange: (tab: RegulationDetailTabKey) => void;
}) {
    const handleTabSelect = (event: unknown) => {
        const key = readSelectedTabKey(event);

        if (key) {
            onChange(key);
        }
    };

    return (
        <DetailTabContainer
            className={REGULATION_SUMMARY_TAB_CLASS}
            onTabSelect={handleTabSelect}
            style={TAB_CONTAINER_STYLE}
        >
            {tabs.map((tab, index) => (
                <Fragment key={tab.key}>
                    {index === 1 ? <TabSeparator /> : null}
                    <Tab
                        text={tab.label}
                        selected={activeTab === tab.key}
                        data-tab-key={tab.key}
                    />
                </Fragment>
            ))}
        </DetailTabContainer>
    );
}

function GeneralTab({ value }: { value: RegulationNode }) {
    const { t } = useTranslation();

    return (
        <div style={{ display: "grid", gap: "0.75rem" }}>
            <DetailRow
                label={t("regulation.fields.code", { defaultValue: "Ú©Ø¯" })}
                value={value.code}
            />
            <DetailRow
                label={t("regulation.fields.name", { defaultValue: "Ù†Ø§Ù…" })}
                value={value.title}
            />
            <DetailRow
                label={t("regulation.fields.type", { defaultValue: "Ù†ÙˆØ¹" })}
                value={resolveNodeTypeLabel(value.nodeType, t)}
            />
            <DetailRow
                label={t("regulation.fields.parent", { defaultValue: "ÙˆØ§Ù„Ø¯" })}
                value={displayText(value.parentId)}
            />
            <DetailRow
                label={t("regulation.fields.status", { defaultValue: "ÙˆØ¶Ø¹ÛŒØª" })}
                value={resolveStatusLabel(value.status, t)}
            />
            <DetailRow
                label={t("regulation.fields.sortOrder", { defaultValue: "ØªØ±ØªÛŒØ¨ Ù†Ù…Ø§ÛŒØ´" })}
                value={displayText(value.sortOrder)}
            />
            <DetailRow
                label={t("regulation.fields.description", { defaultValue: "Ø´Ø±Ø­" })}
                value={value.description}
            />
            <DetailRow
                label={t("regulation.fields.effectiveDate", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§ÛŒØ¬Ø§Ø¯" })}
                value={displayDate(value.effectiveDate)}
            />
            <DetailRow
                label={t("regulation.fields.validTo", { defaultValue: "ØªØ§Ø±ÛŒØ® Ø§Ø¹ØªØ¨Ø§Ø±" })}
                value={displayDate(value.validTo)}
            />
            <DetailRow
                label={t("regulation.fields.issuer", { defaultValue: "Ù…Ø±Ø¬Ø¹ ØµØ§Ø¯Ø±Ú©Ù†Ù†Ø¯Ù‡" })}
                value={value.issuer}
            />
            <DetailRow
                label={t("regulation.fields.owner", { defaultValue: "Ù…Ø§Ù„Ú©" })}
                value={value.ownerName}
            />
            <DetailRow
                label={t("regulation.fields.documents", { defaultValue: "Ù…Ø³ØªÙ†Ø¯Ø§Øª" })}
                value={String(value.documentsCount ?? 0)}
            />
        </div>
    );
}

function TabBody({
    details,
    activeTab,
}: {
    details: RegulationNode;
    activeTab: RegulationDetailTabKey;
}) {

    if (activeTab === "general") {
        return <GeneralTab value={details} />;
    }

    if (activeTab === "requirements" && details.nodeType === "law") {
        return (
            <RegulationRequirementsSummaryTab
                key={`${details.id}:requirements`}
                lawId={details.id}
            />
        );
    }

    return (
        <DocumentIntegrationDeferredMessage />
    );
}

export default function RegulationSummaryPanel({
    value,
    onClose,
}: RegulationSummaryPanelProps) {
    const { t } = useTranslation();
    const selectedId = value?.id ?? null;
    const [activeTab, setActiveTab] = useState<RegulationDetailTabKey>("general");
    const [loadState, setLoadState] = useState<DetailLoadState>(() =>
        createInitialLoadState(value),
    );

    useEffect(() => {
        if (!selectedId) {
            return;
        }

        let active = true;

        void regulationService
            .getById(selectedId)
            .then((details) => {
                if (!active) {
                    return;
                }

                if (!details) {
                    setLoadState({
                        status: "error",
                        details: null,
                        error: t("regulation.errors.notFound", {
                            defaultValue: "Ø¢ÛŒØªÙ… Ù…ÙˆØ±Ø¯Ù†Ø¸Ø± ÛŒØ§ÙØª Ù†Ø´Ø¯",
                        }),
                    });
                    return;
                }

                setLoadState({
                    status: "success",
                    details,
                    error: null,
                });
            })
            .catch((error: unknown) => {
                if (!active) {
                    return;
                }

                setLoadState({
                    status: "error",
                    details: null,
                    error: mapLoadError(
                        error,
                        t("regulation.details.loadError", {
                            defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø¬Ø²Ø¦ÛŒØ§Øª Ù‚Ø§Ù†ÙˆÙ†",
                        }),
                    ),
                });
            });

        return () => {
            active = false;
        };
    }, [selectedId, t]);

    const details = loadState.status === "success" ? loadState.details : null;
    const tabNodeType = details?.nodeType ?? value?.nodeType ?? null;

    const tabs = useMemo(
        () => (tabNodeType ? getTabs(tabNodeType, t) : []),
        [t, tabNodeType],
    );

    const effectiveActiveTab = tabs.some((tab) => tab.key === activeTab)
        ? activeTab
        : tabs[0]?.key ?? "general";

    const title = details?.title ?? t("regulation.object.summaryTitle", {
        defaultValue: "Ø¬Ø²Ø¦ÛŒØ§Øª Ù‚Ø§Ù†ÙˆÙ†",
    });

    return (
        <div
            style={{
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                minHeight: "100%",
                gap: "1rem",
                minWidth: 0,
            }}
        >
            <Bar
                startContent={
                    <Title level="H4">
                        {title}
                    </Title>
                }
            />

            <div style={{ display: "grid", gap: "1rem", alignContent: "start", minWidth: 0 }}>
                {!value ? (
                    <MessageStrip design="Information" hideCloseButton>
                        {t("regulation.object.selectPrompt", {
                            defaultValue: "Ø¨Ø±Ø§ÛŒ Ù…Ø´Ø§Ù‡Ø¯Ù‡ Ø¬Ø²Ø¦ÛŒØ§ØªØŒ ÛŒÚ© Ø¢ÛŒØªÙ… Ù‚Ø§Ù†ÙˆÙ† Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯.",
                        })}
                    </MessageStrip>
                ) : (
                    <div style={{ minWidth: 0, maxWidth: "100%" }}>
                        {details ? (
                            <div style={HEADER_GRID_STYLE}>
                                <DetailRow
                                    label={t("regulation.fields.name", { defaultValue: "Ù†Ø§Ù…" })}
                                    value={details.title}
                                />
                                <DetailRow
                                    label={t("regulation.fields.code", { defaultValue: "Ú©Ø¯" })}
                                    value={details.code}
                                />
                                <DetailRow
                                    label={t("regulation.fields.type", { defaultValue: "Ù†ÙˆØ¹" })}
                                    value={resolveNodeTypeLabel(details.nodeType, t)}
                                />
                            </div>
                        ) : null}

                        {tabs.length > 0 ? (
                            <RegulationTabs
                                tabs={tabs}
                                activeTab={effectiveActiveTab}
                                onChange={setActiveTab}
                            />
                        ) : null}

                        <div style={{ ...TAB_BODY_STYLE, minWidth: 0, overflowX: "auto" }}>
                            {loadState.status === "loading" ? (
                                <div style={LOADING_STYLE}>
                                    <BusyIndicator active delay={0} />
                                </div>
                            ) : loadState.status === "error" ? (
                                <MessageStrip design="Negative" hideCloseButton>
                                    {loadState.error}
                                </MessageStrip>
                            ) : details ? (
                                <TabBody
                                    details={details}
                                    activeTab={effectiveActiveTab}
                                />
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            <Bar
                endContent={
                    <Button
                        design="Transparent"
                        style={ACTION_BUTTON_STYLE}
                        onClick={onClose}
                    >
                        {t("common.close", {
                            defaultValue: "Ø¨Ø³ØªÙ†",
                        })}
                    </Button>
                }
            />
        </div>
    );
}

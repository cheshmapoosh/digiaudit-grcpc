import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, MessageStrip, Option, Select, Title } from "@ui5/webcomponents-react";
import { useAuthState } from "@/features/auth/state/auth.state";
import { canAccessMasterData } from "@/features/master-data/security/masterDataAccess";
import type { OrganizationTabKey } from "@/features/organization/pages/OrganizationObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import type {
    LocalContextRow, LocalPage, LocalSectionKey, LocalStatus,
} from "../domain/local.model";
import { LOCAL_SECTIONS, LOCAL_SECTION_BY_KEY, type LocalSectionSpec } from "../domain/local.sections";
import { localApi } from "../infra/local.api.repo";
import LocalOptionPicker from "./LocalOptionPicker";
import LocalSectionPane from "./LocalSectionPane";
import LocalLinkedCoverageList from "./LocalLinkedCoverageList";

interface Props {
    organizationId: string | null;
    tab: OrganizationTabKey;
    onDirtyChange: (dirty: boolean) => void;
    navigateWithinOrganization: (params: URLSearchParams) => void;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_TABS: OrganizationTabKey[] = [
    "subprocesses", "risks", "controls", "regulations", "objectives", "policies",
];

function isSection(value: string | null): value is LocalSectionKey {
    return Boolean(value && Object.hasOwn(LOCAL_SECTION_BY_KEY, value));
}

export default function LocalOrganizationWorkspace({
    organizationId, tab, onDirtyChange, navigateWithinOrganization,
}: Props) {
    const { t } = useTranslation();
    const location = useLocation();
    const me = useAuthState((state) => state.me);
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const rawSection = params.get("localSection");
    const rawContext = params.get("contextId");
    const rawRow = params.get("localRowId");
    const rawTarget = params.get("policyTargetId");
    const rawStatus = params.get("localStatus");
    const malformed = [rawContext, rawRow, rawTarget].some(
        (value) => value !== null && !UUID_PATTERN.test(value),
    ) || Boolean(rawStatus && !["ACTIVE", "INACTIVE", "DELETED"].includes(rawStatus));
    const [contextResult, setContextResult] = useState<LocalPage<LocalContextRow> | null>(null);
    const [deletedContexts, setDeletedContexts] = useState<LocalPage<LocalContextRow> | null>(null);
    const [contextPage, setContextPage] = useState(0);
    const [deletedContextPage, setDeletedContextPage] = useState(0);
    const [selectedContext, setSelectedContext] = useState<LocalContextRow | null>(null);
    const [validatedTargetId, setValidatedTargetId] = useState<string | null>(null);
    const [targetLabel, setTargetLabel] = useState<string | null>(null);
    const [contextError, setContextError] = useState<string | null>(null);
    const [validatedContextId, setValidatedContextId] = useState<string | null>(null);
    const [dirtyBySection, setDirtyBySection] = useState<Partial<Record<LocalSectionKey, boolean>>>({});
    const [pendingNavigation, setPendingNavigation] = useState<URLSearchParams | null>(null);
    const [resetKey, setResetKey] = useState(0);
    const [contextRefreshKey, setContextRefreshKey] = useState(0);
    const referenceView = canAccessMasterData(me, "REFERENCE");
    const referenceManage = canAccessMasterData(me, "REFERENCE", true);
    const processView = canAccessMasterData(me, "PROCESS");
    const canRead = useCallback((spec: LocalSectionSpec) =>
        referenceView && spec.areas.every((area) => canAccessMasterData(me, area)),
    [me, referenceView]);
    const canWrite = useCallback((spec: LocalSectionSpec) =>
        referenceManage && spec.areas.every((area) => canAccessMasterData(me, area)),
    [me, referenceManage]);
    const visibleSections = LOCAL_SECTIONS.filter((spec) => spec.tab === tab && canRead(spec));
    const requestedSection = isSection(rawSection) ? LOCAL_SECTION_BY_KEY[rawSection] : null;
    const activeSpec = requestedSection?.tab === tab && canRead(requestedSection)
        ? requestedSection : visibleSections[0] ?? null;
    const needsContext = activeSpec && activeSpec.key !== "contexts"
        && activeSpec.key !== "organization-policies";
    const needsTarget = activeSpec?.key === "control-policies"
        || activeSpec?.key === "requirement-policies";
    const contextId = !malformed && rawContext === validatedContextId
        ? validatedContextId : null;
    const policyTargetId = !malformed && needsTarget && rawTarget === validatedTargetId
        ? validatedTargetId : null;
    const statusFilter = rawStatus && !malformed ? rawStatus as LocalStatus : null;
    const dirty = Object.values(dirtyBySection).some(Boolean);

    useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);

    useEffect(() => {
        if (!organizationId || !processView || !LOCAL_TABS.includes(tab)) return;
        let current = true;
        void Promise.all([
            localApi.list("contexts", { organizationId }, null, contextPage, 100),
            localApi.list("contexts", { organizationId }, "DELETED", deletedContextPage, 100),
        ]).then(([normal, deleted]) => {
            if (!current) return;
            setContextResult((previous) => contextPage === 0 ? normal : {
                ...normal,
                items: [...(previous?.items ?? []), ...normal.items]
                    .filter((row, index, all) => all.findIndex((item) => item.id === row.id) === index),
            });
            setDeletedContexts((previous) => deletedContextPage === 0 ? deleted : {
                ...deleted,
                items: [...(previous?.items ?? []), ...deleted.items]
                    .filter((row, index, all) => all.findIndex((item) => item.id === row.id) === index),
            });
            setContextError(null);
        }).catch((cause: unknown) => {
            if (!current) return;
            setContextError(cause instanceof Error ? cause.message
                : t("local.errors.contexts", { defaultValue: "زمینه‌ها بارگذاری نشدند." }));
        });
        return () => { current = false; };
    }, [organizationId, processView, tab, contextRefreshKey,
        contextPage, deletedContextPage, t]);

    useEffect(() => {
        if (!organizationId || !rawContext || malformed || !processView) {
            queueMicrotask(() => setValidatedContextId(null));
            return;
        }
        let current = true;
        void localApi.detail("contexts", { organizationId }, rawContext)
            .then((context) => {
                if (current) {
                    setValidatedContextId(rawContext);
                    setSelectedContext(context);
                }
            })
            .catch(() => {
                if (!current) return;
                setValidatedContextId(null);
                setSelectedContext(null);
                setContextError(t("local.errors.invalidSelection", {
                    defaultValue: "زمینهٔ انتخاب‌شده متعلق به این سازمان نیست یا یافت نشد.",
                }));
            });
        return () => { current = false; };
    }, [organizationId, rawContext, malformed, processView, t]);

    useEffect(() => {
        if (!organizationId || !contextId || !rawTarget || malformed || !needsTarget) {
            queueMicrotask(() => {
                setValidatedTargetId(null);
                setTargetLabel(null);
            });
            return;
        }
        let current = true;
        const controlTarget = activeSpec?.key === "control-policies";
        const targetRequest = controlTarget
            ? localApi.detail("control-scopes", { organizationId, contextId }, rawTarget)
                .then((target) => target.controlLabel)
            : localApi.detail("requirement-scopes", { organizationId, contextId }, rawTarget)
                .then((target) => target.requirementLabel);
        void targetRequest.then((label) => {
                if (!current) return;
                setValidatedTargetId(rawTarget);
                setTargetLabel(label);
            })
            .catch(() => {
                if (!current) return;
                setValidatedTargetId(null);
                setTargetLabel(null);
                setContextError(t("local.errors.invalidSelection", {
                    defaultValue: "هدف محلی انتخاب‌شده یافت نشد.",
                }));
            });
        return () => { current = false; };
    }, [organizationId, contextId, rawTarget, malformed, needsTarget, activeSpec?.key, t]);

    const navigateParams = (next: URLSearchParams, discard = false) => {
        if (dirty && discard) {
            setPendingNavigation(next);
            return;
        }
        navigateWithinOrganization(next);
    };

    const setSelection = (values: Record<string, string | null>, discard = false) => {
        const next = new URLSearchParams(location.search);
        for (const [key, value] of Object.entries(values)) {
            if (value) next.set(key, value);
            else next.delete(key);
        }
        navigateParams(next, discard);
    };

    const setSection = (spec: LocalSectionSpec) => {
        setSelection({
            tab: spec.tab,
            localSection: spec.key,
            localRowId: null,
            policyTargetId: spec.key === "control-policies"
                || spec.key === "requirement-policies" ? rawTarget : null,
        }, true);
    };

    const contextItems = [
        ...(contextResult?.items ?? []),
        ...(deletedContexts?.items ?? []),
        ...(selectedContext && ![...(contextResult?.items ?? []),
            ...(deletedContexts?.items ?? [])].some((row) => row.id === selectedContext.id)
            ? [selectedContext] : []),
    ];
    const linked: LocalSectionKey[] = tab === "risks"
        ? ["risk-control-coverages"]
        : tab === "regulations" ? ["requirement-control-coverages"]
            : tab === "objectives"
                ? ["risk-control-objective-coverages",
                    "control-control-objective-coverages"]
                : [];

    if (!LOCAL_TABS.includes(tab)) return null;
    if (!organizationId) return <MessageStrip design="Information" hideCloseButton>
        {t("local.saveOrganizationFirst", {
            defaultValue: "ابتدا اطلاعات سازمان را ذخیره کنید؛ سپس روابط محلی را ثبت کنید.",
        })}
    </MessageStrip>;
    if (malformed || (rawSection && !isSection(rawSection))) {
        return <MessageStrip design="Negative" hideCloseButton>
            {t("local.errors.invalidSelection", { defaultValue: "انتخاب یا پیوند محلی نامعتبر است." })}
        </MessageStrip>;
    }
    if (!referenceView || visibleSections.length === 0) {
        return <MessageStrip design="Critical" hideCloseButton>
            {t("local.forbidden", { defaultValue: "دسترسی به این بخش مجاز نیست." })}
        </MessageStrip>;
    }

    return <div style={{ display: "grid", gap: "0.8rem" }}>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {visibleSections.map((spec) => <Button key={spec.key}
                design={activeSpec?.key === spec.key ? "Emphasized" : "Transparent"}
                onClick={() => setSection(spec)}>
                {t(spec.labelKey, { defaultValue: spec.labelFa })}
            </Button>)}
        </div>
        {processView && tab !== "subprocesses" && activeSpec?.key !== "organization-policies"
            ? <div style={{ display: "grid", gap: "0.3rem" }}>
                <Title level="H6">{t("local.contextSelector", {
                    defaultValue: "زمینهٔ سازمان و زیرفرآیند",
                })}</Title>
                <Select value={rawContext ?? ""}
                    accessibleName={t("local.contextSelector", {
                        defaultValue: "زمینهٔ سازمان و زیرفرآیند",
                    })}
                    onChange={(event) => setSelection({
                        contextId: event.target.value || null,
                        localRowId: null,
                        policyTargetId: null,
                    }, true)}>
                    <Option value="">{t("local.options.none", { defaultValue: "انتخاب نشده" })}</Option>
                    {contextItems.map((context) => <Option key={context.id} value={context.id}>
                        {context.subprocessCode} — {context.subprocessLabel} ({context.status})
                    </Option>)}
                </Select>
                {contextError ? <MessageStrip design="Negative" hideCloseButton>
                    {contextError}
                </MessageStrip> : null}
                {contextItems.length === 0 ? <Button design="Transparent"
                    onClick={() => setSelection({
                        tab: "subprocesses", localSection: "contexts", localRowId: null,
                    })}>
                    {t("local.goToContexts", { defaultValue: "ایجاد زمینه در تب زیرفرآیندها" })}
                </Button> : null}
                {contextResult && contextPage + 1 < contextResult.totalPages
                    ? <Button design="Transparent"
                        onClick={() => setContextPage((page) => page + 1)}>
                        {t("local.options.next", { defaultValue: "بعدی" })}
                    </Button> : null}
                {deletedContexts && deletedContextPage + 1 < deletedContexts.totalPages
                    ? <Button design="Transparent"
                        onClick={() => setDeletedContextPage((page) => page + 1)}>
                        {t("local.contexts.moreDeleted", {
                            defaultValue: "زمینه‌های حذف‌شدهٔ بیشتر",
                        })}
                    </Button> : null}
            </div> : null}
        {needsContext && !contextId ? <MessageStrip design="Information" hideCloseButton>
            {t("local.selectContext", { defaultValue: "برای مشاهدهٔ روابط، یک زمینه انتخاب کنید." })}
        </MessageStrip> : null}
        {needsTarget && contextId ? <LocalOptionPicker
            label={t(activeSpec?.key === "control-policies"
                ? "local.fields.localControlScope" : "local.fields.localRequirementScope", {
                defaultValue: activeSpec?.key === "control-policies"
                    ? "کنترل محلی" : "الزام محلی",
            })}
            path={`organization-subprocess-scopes/${contextId}/${activeSpec?.key === "control-policies"
                ? "control-scopes" : "requirement-scopes"}`}
            params={{ organizationId, lifecycleStatus: "ACTIVE" }} searchable={false}
            value={policyTargetId} currentLabel={targetLabel}
            disabled={Boolean(rawRow)} onChange={(id) => setSelection({
                policyTargetId: id, localRowId: null,
            }, true)} />
            : null}
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <Title level="H6">{t("local.statusFilter", { defaultValue: "وضعیت فهرست" })}</Title>
            <Select value={rawStatus ?? ""} accessibleName={t("local.statusFilter", {
                defaultValue: "وضعیت فهرست",
            })} onChange={(event) => setSelection({
                localStatus: event.target.value || null,
                localRowId: null,
            }, true)}>
                <Option value="">{t("local.status.allCurrent", {
                    defaultValue: "فعال و غیرفعال",
                })}</Option>
                <Option value="ACTIVE">{t("local.status.ACTIVE", { defaultValue: "فعال" })}</Option>
                <Option value="INACTIVE">{t("local.status.INACTIVE", {
                    defaultValue: "غیرفعال",
                })}</Option>
                <Option value="DELETED">{t("local.status.DELETED", { defaultValue: "حذف‌شده" })}</Option>
            </Select>
        </div>
        {LOCAL_SECTIONS.filter((spec) => canRead(spec)).map((spec) =>
            <LocalSectionPane key={spec.key} spec={spec} organizationId={organizationId}
                contextId={contextId} policyTargetId={policyTargetId}
                active={activeSpec?.key === spec.key && (!needsContext || Boolean(contextId))
                    && (!needsTarget || Boolean(policyTargetId))}
                selectedRowId={activeSpec?.key === spec.key ? rawRow : null}
                statusFilter={statusFilter} canWrite={canWrite(spec)}
                onSelectRow={(id) => setSelection({
                    tab: spec.tab, localSection: spec.key, localRowId: id,
                })}
                onDirtyChange={(section, value) => setDirtyBySection((previous) =>
                    previous[section] === value ? previous : { ...previous, [section]: value })}
                onContextCreated={(id) => {
                    setContextRefreshKey((key) => key + 1);
                    setSelection({ contextId: id });
                }}
                resetKey={resetKey} />)}
        {contextId ? linked.filter((key) => canRead(LOCAL_SECTION_BY_KEY[key]))
            .map((key) => <LocalLinkedCoverageList key={key} section={key}
                organizationId={organizationId} contextId={contextId}
                labelKey={LOCAL_SECTION_BY_KEY[key].labelKey}
                labelFa={LOCAL_SECTION_BY_KEY[key].labelFa}
                onOpen={(_, row) => setSelection({
                    tab: LOCAL_SECTION_BY_KEY[key].tab,
                    localSection: key,
                    localRowId: row.id,
                    localStatus: row.status === "DELETED" ? "DELETED" : null,
                }, true)} />) : null}
        <DeleteConfirmDialog open={pendingNavigation !== null}
            title={t("common.unsavedChanges.title", { defaultValue: "تغییرات ذخیره‌نشده" })}
            message={t("common.unsavedChanges.message", {
                defaultValue: "تغییرات ذخیره نشده‌اند. از آن‌ها صرف‌نظر می‌کنید؟",
            })} onClose={() => setPendingNavigation(null)}
            onConfirm={() => {
                const next = pendingNavigation;
                setPendingNavigation(null);
                setResetKey((key) => key + 1);
                setDirtyBySection({});
                if (next) navigateWithinOrganization(next);
            }} confirmText={t("local.discard", {
                defaultValue: "صرف‌نظر از تغییرات",
            })} />
    </div>;
}

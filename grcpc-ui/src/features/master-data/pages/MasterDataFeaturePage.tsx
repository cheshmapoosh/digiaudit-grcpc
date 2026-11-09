import { currentProfile, useProfileState } from "@/features/dataset-profile/state/profile.state";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, FlexBox, Grid, Icon, MessageStrip, Text, Title } from "@ui5/webcomponents-react";
import { useAuthState } from "@/features/auth/state/auth.state";
import { areaForPath, canAccessMasterData } from "../security/masterDataAccess";
import { masterDataCatalogCountsApi, type CatalogCounts } from "../infra/masterDataCatalogCounts.api.repo";
import "./master-data.css";

type MasterDataItem = {
    key: string;
    icon: string;
    route: string;
};

// The order follows the RTL launcher in the supplied governance layout.
const MASTER_DATA_ITEMS: MasterDataItem[] = [
    { key: "organizations", icon: "org-chart", route: "/organizations" },
    { key: "processes", icon: "process", route: "/processes" },
    { key: "controls", icon: "shield", route: "/controls" },
    { key: "risks", icon: "alert", route: "/risks" },
    { key: "regulations", icon: "official-service", route: "/regulations" },
    { key: "globalControls", icon: "checklist", route: "/global-controls" },
    { key: "businessObjectives", icon: "flag", route: "/objectives" },
    { key: "objectives", icon: "target-group", route: "/control-objectives" },
    { key: "accountGroups", icon: "accounting-document-verification", route: "/account-groups" },
    { key: "policies", icon: "document-text", route: "/policies" },
];

export default function MasterDataFeaturePage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    useProfileState((state) => state.profiles);
    const me = useAuthState((state) => state.me);
    const profileId = currentProfile()?.id;
    const [result, setResult] = useState<{ profileId: string; counts: CatalogCounts | null } | null>(null);
    const counts = result && result.profileId === profileId ? result.counts : undefined;
    const numberFormat = new Intl.NumberFormat(i18n.language.startsWith("fa") ? "fa-IR" : "en-US");

    useEffect(() => {
        if (!profileId || !me) return;
        const controller = new AbortController();
        const saveResult = (counts: CatalogCounts | null) => {
            if (!controller.signal.aborted) setResult({ profileId, counts });
        };
        masterDataCatalogCountsApi.get(controller.signal).then(saveResult, () => saveResult(null));
        return () => controller.abort();
    }, [profileId, me]);

    const items = MASTER_DATA_ITEMS.filter((item) => {
        const area = areaForPath(item.route);
        return Boolean(area && canAccessMasterData(me, area));
    }).map((item) => ({
        ...item,
        title: t(`masterData.items.${item.key}`),
        count: counts?.[item.key],
    }));

    return (
        <FlexBox as="section" direction="Column" gap="var(--sapContent_Gap)" className="masterDataPage" aria-labelledby="master-data-page-title">
            <Title id="master-data-page-title" level="H3" wrappingType="Normal">{t("masterData.governanceTitle")}</Title>
            {counts === null ? <MessageStrip design="Negative" hideCloseButton>{t("masterData.countError")}</MessageStrip> : null}

            <Grid className="masterDataTiles" defaultSpan="XL2 L3 M6 S12">
                {items.map((item) => (
                    <Card key={item.key} className="masterDataTileCard" accessibleName={item.title} onClick={() => navigate(item.route)} header={
                        <CardHeader
                            interactive
                            titleText={item.title}
                            onClick={(event) => { event.stopPropagation(); navigate(item.route); }}
                        />
                    }>
                        <FlexBox alignItems="Center" className="masterDataCardContent">
                            <Icon name={item.icon} design="Neutral" mode="Decorative" />
                            <Text>{item.count === undefined ? "—" : t("masterData.itemCount", {
                                count: item.count, number: numberFormat.format(item.count),
                            })}</Text>
                        </FlexBox>
                    </Card>
                ))}
            </Grid>
        </FlexBox>
    );
}

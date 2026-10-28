import { useProfileState } from "@/features/dataset-profile/state/profile.state";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar, Card, CardHeader, FlexBox, Grid, Text, Title } from "@ui5/webcomponents-react";
import { useAuthState } from "@/features/auth/state/auth.state";
import { areaForPath, canAccessMasterData } from "../security/masterDataAccess";
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
    const { t } = useTranslation();
    const navigate = useNavigate();
    useProfileState((state) => state.profiles);
    const me = useAuthState((state) => state.me);

    const items = MASTER_DATA_ITEMS.filter((item) => {
        const area = areaForPath(item.route);
        return Boolean(area && canAccessMasterData(me, area));
    }).map((item) => ({
        ...item,
        title: t(`masterData.items.${item.key}`),
        description: t(`masterData.items.${item.key}.description`),
    }));

    return (
        <FlexBox as="section" direction="Column" gap="var(--sapContent_Gap)" className="masterDataPage" aria-labelledby="master-data-page-title">
            <Title id="master-data-page-title" level="H3" wrappingType="Normal">{t("masterData.governanceTitle")}</Title>

            <Grid className="masterDataTiles" defaultSpan="XL3 L4 M6 S12">
                {items.map((item) => (
                    <Card key={item.key} className="masterDataTileCard" accessibleName={item.title} onClick={() => navigate(item.route)} header={
                        <CardHeader
                            interactive
                            titleText={item.title}
                            onClick={(event) => { event.stopPropagation(); navigate(item.route); }}
                            avatar={<Avatar icon={item.icon} shape="Square" size="S" />}
                        />
                    }>
                        <FlexBox direction="Column" className="masterDataCardContent">
                            <Text>{item.description}</Text>
                        </FlexBox>
                    </Card>
                ))}
            </Grid>
        </FlexBox>
    );
}

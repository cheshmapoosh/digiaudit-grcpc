import {Title, Card, CardHeader, Text} from "@ui5/webcomponents-react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";

import RolesKpiCard from "../components/kpi/RolesKpiCard";

export default function DashboardFeaturePage() {
    const {t} = useTranslation();
    const navigate = useNavigate();

    return (
        <div style={{
            padding: 16,
            background: "var(--sapBackgroundColor)",
            color: "var(--sapTextColor)",
            minHeight: "100%"
        }}>
            <Title level="H3">{t("nav.dashboard")}</Title>

            {/* KPI SECTION - CSS Grid */}
            <div
                style={{
                    marginTop: 16,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 16
                }}
            >
                <RolesKpiCard
                    value={128}
                    onPress={() => navigate("/access-control/roles")}
                />

                <Card
                    header={
                        <CardHeader
                            titleText={t("kpi.users.title")}
                            subtitleText={t("kpi.users.subtitle")}
                        />
                    }
                >
                    <div style={{padding: 16}}>
                        <div style={{fontSize: 32, fontWeight: 700}}>2,431</div>
                        <Text style={{opacity: 0.7}}>{t("kpi.users.unit")}</Text>
                    </div>
                </Card>

                <Card
                    header={
                        <CardHeader
                            titleText={t("kpi.risks.title")}
                            subtitleText={t("kpi.risks.subtitle")}
                        />
                    }
                >
                    <div style={{padding: 16}}>
                        <div style={{fontSize: 32, fontWeight: 700}}>17</div>
                        <Text style={{opacity: 0.7}}>{t("kpi.risks.unit")}</Text>
                    </div>
                </Card>

                <Card
                    header={
                        <CardHeader
                            titleText={t("kpi.violations.title")}
                            subtitleText={t("kpi.violations.subtitle")}
                        />
                    }
                >
                    <div style={{padding: 16}}>
                        <div style={{fontSize: 32, fontWeight: 700}}>42</div>
                        <Text style={{opacity: 0.7}}>{t("kpi.violations.unit")}</Text>
                    </div>
                </Card>
            </div>

            {/* OVERVIEW SECTION - CSS Grid */}
            <div
                style={{
                    marginTop: 16,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                    gap: 16
                }}
            >
                <Card
                    header={
                        <CardHeader
                            titleText={t("dashboard.recentRoles.title")}
                            subtitleText={t("dashboard.recentRoles.subtitle")}
                        />
                    }
                >
                    <div style={{padding: 16}}>
                        <Text>ADMIN</Text><br/>
                        <Text>SUPERVISOR</Text><br/>
                        <Text>AUDITOR</Text>
                    </div>
                </Card>

                <Card
                    header={
                        <CardHeader
                            titleText={t("dashboard.pendingTasks.title")}
                            subtitleText={t("dashboard.pendingTasks.subtitle")}
                        />
                    }
                >
                    <div style={{padding: 16}}>
                        <Text>{t("dashboard.pendingTasks.roleApproval")}</Text><br/>
                        <Text>{t("dashboard.pendingTasks.riskReview")}</Text><br/>
                        <Text>{t("dashboard.pendingTasks.controlAssessment")}</Text>
                    </div>
                </Card>
            </div>
        </div>
    );
}

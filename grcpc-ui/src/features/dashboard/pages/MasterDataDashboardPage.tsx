import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BusyIndicator, Button, Card, CardHeader, List, ListItemCustom, MessageStrip, Text, Title,
} from "@ui5/webcomponents-react";
import { BarChart, ColumnChart, DonutChart, LineChart } from "@ui5/webcomponents-react-charts";
import type { DashboardKpiKey, MasterDataDashboard } from "../domain/masterDataDashboard";
import { masterDataDashboardApi } from "../infra/masterDataDashboard.api.repo";
import "./dashboard.css";

type LoadState =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ready"; data: MasterDataDashboard };

const KPI_ROUTES: Record<DashboardKpiKey, string> = {
  ORGANIZATION: "/organizations",
  PROCESS_AND_SUBPROCESS: "/processes",
  RISK_TEMPLATE: "/risks",
  CONTROL: "/controls",
};

function hasValues(values: number[]): boolean {
  return values.some((value) => value > 0);
}

export default function MasterDataDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const isFa = i18n.language.startsWith("fa");
  const locale = isFa ? "fa-IR" : "en-US";
  const numberFormatter = new Intl.NumberFormat(locale);
  const monthFormatter = new Intl.DateTimeFormat(isFa ? "fa-IR-u-ca-gregory" : "en-US-u-ca-gregory", {
    year: "numeric", month: "short", timeZone: "UTC",
  });
  const dateTimeFormatter = new Intl.DateTimeFormat(isFa ? "fa-IR-u-ca-persian" : "en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  useEffect(() => {
    const controller = new AbortController();
    masterDataDashboardApi.get(controller.signal).then(
      (data) => setState({ phase: "ready", data }),
      (error: unknown) => {
        if (!(error instanceof Error && error.name === "AbortError")) {
          setState({ phase: "error" });
        }
      },
    );
    return () => controller.abort();
  }, [refreshKey]);

  function retry() {
    setState({ phase: "loading" });
    setRefreshKey((key) => key + 1);
  }

  const data = state.phase === "ready" ? state.data : null;
  const riskVisible = data?.statusCounts.some((item) => item.type === "RISK_TEMPLATE") ?? false;
  const processVisible = data?.statusCounts.some((item) => item.type === "PROCESS") ?? false;
  const riskDataset = data?.riskTypes.map((item) => ({
    label: t(`dashboard.masterData.riskType.${item.type}`), count: item.count,
  })) ?? [];
  const statusDataset = data?.statusCounts.map((item) => ({
    label: t(`dashboard.masterData.type.${item.type}`), active: item.active, inactive: item.inactive,
  })) ?? [];
  const processDataset = data?.topProcesses.map((item) => ({
    label: item.title, count: item.activeSubprocesses,
  })) ?? [];
  const monthDataset = data?.registrations.map((item) => ({
    label: monthFormatter.format(new Date(`${item.month}-01T00:00:00Z`)), count: item.count,
  })) ?? [];

  return (
    <section className="masterDataDashboard" dir={isFa ? "rtl" : "ltr"} aria-labelledby="dashboard-title">
      <div className="masterDataDashboardHeading">
        <Title id="dashboard-title" level="H2">{t("dashboard.masterData.title")}</Title>
      </div>

      {state.phase === "loading" && (
        <div className="masterDataDashboardState"><BusyIndicator active>{t("dashboard.masterData.loading")}</BusyIndicator></div>
      )}
      {state.phase === "error" && (
        <div className="masterDataDashboardState">
          <MessageStrip design="Negative">{t("dashboard.masterData.error")}</MessageStrip>
          <Button onClick={retry}>{t("dashboard.masterData.retry")}</Button>
        </div>
      )}
      {data && data.kpis.length === 0 && (
        <MessageStrip design="Information">{t("dashboard.masterData.noAccess")}</MessageStrip>
      )}

      {data && data.kpis.length > 0 && <>
        <div className="masterDataDashboardKpis">
          {data.kpis.map((kpi) => {
            const route = KPI_ROUTES[kpi.key];
            const label = t(`dashboard.masterData.kpi.${kpi.key}`);
            return <Card
              key={kpi.key}
              className="masterDataDashboardKpi"
              onClick={() => navigate(route)}
              header={<CardHeader interactive titleText={label} onClick={(event) => { event.stopPropagation(); navigate(route); }} />}
            >
              <div className="masterDataDashboardKpiBody">
                <strong>{numberFormatter.format(kpi.count)}</strong>
                <Button
                  design="Transparent"
                  icon="navigation-left-arrow"
                  accessibleName={t("dashboard.masterData.viewArea", { area: label })}
                  onClick={(event) => { event.stopPropagation(); navigate(route); }}
                />
              </div>
            </Card>;
          })}
        </div>

        <div className="masterDataDashboardCharts">
          {riskVisible && <Card header={<CardHeader titleText={t("dashboard.masterData.riskDistribution")} />}>
            <div className="masterDataDashboardChart">
              {hasValues(riskDataset.map((item) => item.count))
                ? <DonutChart className="masterDataDashboardPlot" dataset={riskDataset} dimension={{ accessor: "label" }} measure={{ accessor: "count" }} noAnimation />
                : <Text>{t("dashboard.masterData.noData")}</Text>}
            </div>
          </Card>}

          {statusDataset.length > 0 && <Card header={<CardHeader titleText={t("dashboard.masterData.statusDistribution")} />}>
            <div className="masterDataDashboardChart">
              {hasValues(statusDataset.flatMap((item) => [item.active, item.inactive]))
                ? <ColumnChart className="masterDataDashboardPlot" dataset={statusDataset} dimensions={[{ accessor: "label" }]}
                    measures={[{ accessor: "active", label: t("dashboard.masterData.active") }, { accessor: "inactive", label: t("dashboard.masterData.inactive") }]} noAnimation />
                : <Text>{t("dashboard.masterData.noData")}</Text>}
            </div>
          </Card>}

          {processVisible && <Card header={<CardHeader titleText={t("dashboard.masterData.topProcesses")} />}>
            <div className="masterDataDashboardChart">
              {processDataset.length > 0
                ? <BarChart className="masterDataDashboardPlot" dataset={processDataset} dimensions={[{ accessor: "label" }]}
                    measures={[{ accessor: "count", label: t("dashboard.masterData.activeSubprocesses") }]} noAnimation />
                : <Text>{t("dashboard.masterData.noData")}</Text>}
            </div>
          </Card>}

          <Card header={<CardHeader titleText={t("dashboard.masterData.registrations")} />}>
            <div className="masterDataDashboardChart">
              {hasValues(monthDataset.map((item) => item.count))
                ? <LineChart className="masterDataDashboardPlot" dataset={monthDataset} dimensions={[{ accessor: "label" }]}
                    measures={[{ accessor: "count", label: t("dashboard.masterData.recordCount"), showDot: true }]} noAnimation />
                : <Text>{t("dashboard.masterData.noData")}</Text>}
            </div>
          </Card>
        </div>

        <Card className="masterDataDashboardRecent" header={<CardHeader titleText={t("dashboard.masterData.recentChanges")} />}>
          {data.recentChanges.length === 0
            ? <div className="masterDataDashboardEmpty"><Text>{t("dashboard.masterData.noData")}</Text></div>
            : <List>
                {data.recentChanges.map((change) => <ListItemCustom key={`${change.type}-${change.id}`}>
                  <div className="masterDataDashboardChange">
                    <Text>{t(`dashboard.masterData.type.${change.type}`)}</Text>
                    <strong>{change.title}</strong>
                    <Text>{t("dashboard.masterData.updatedAt")}: {dateTimeFormatter.format(new Date(change.updatedAt))}</Text>
                  </div>
                </ListItemCustom>)}
              </List>}
        </Card>
      </>}
    </section>
  );
}

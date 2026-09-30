export type DashboardRecordType = "ORGANIZATION" | "PROCESS" | "SUBPROCESS" | "RISK_TEMPLATE" | "CONTROL";
export type DashboardKpiKey = "ORGANIZATION" | "PROCESS_AND_SUBPROCESS" | "RISK_TEMPLATE" | "CONTROL";

export type MasterDataDashboard = {
  kpis: { key: DashboardKpiKey; count: number }[];
  statusCounts: { type: DashboardRecordType; active: number; inactive: number }[];
  riskTypes: { type: "COMPANY" | "OPERATION"; count: number }[];
  topProcesses: { id: string; title: string; activeSubprocesses: number }[];
  registrations: { month: string; count: number }[];
  recentChanges: { type: DashboardRecordType; id: string; title: string; updatedAt: string }[];
};

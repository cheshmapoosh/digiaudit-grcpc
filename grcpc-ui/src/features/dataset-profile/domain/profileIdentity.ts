// Names are persisted as text; keep this palette aligned with backend ProfileIdentity.
export const PROFILE_COLORS = [
  { name: "blue", value: "#0070F2" },
  { name: "navy", value: "#1B4F72" },
  { name: "sky", value: "#2980B9" },
  { name: "cyan", value: "#008B8B" },
  { name: "teal", value: "#00796B" },
  { name: "green", value: "#2E7D32" },
  { name: "forest", value: "#145A32" },
  { name: "olive", value: "#6B8E23" },
  { name: "lime", value: "#7CB342" },
  { name: "yellow", value: "#F9A825" },
  { name: "amber", value: "#FF8F00" },
  { name: "orange", value: "#E76500" },
  { name: "coral", value: "#E76F51" },
  { name: "red", value: "#C0392B" },
  { name: "burgundy", value: "#7B241C" },
  { name: "pink", value: "#C2185B" },
  { name: "purple", value: "#8E44AD" },
  { name: "indigo", value: "#5B2C6F" },
  { name: "slate", value: "#546E7A" },
  { name: "brown", value: "#795548" },
] as const;

export const PROFILE_ICONS = [
  "building",
  "company-view",
  "org-chart",
  "official-service",
  "factory",
  "business-objects-experience",
  "functional-location",
  "home",
  "group",
  "world",
  "globe",
  "customer",
  "manager",
  "collaborate",
  "business-card",
  "capital-projects",
  "retail-store",
  "education",
  "supplier",
  "suitcase",
] as const;

export function profileColor(name?: string | null) {
  return PROFILE_COLORS.find((item) => item.name === name) ?? PROFILE_COLORS[0];
}

export function profileIcon(name?: string | null) {
  return PROFILE_ICONS.find((item) => item === name) ?? PROFILE_ICONS[0];
}

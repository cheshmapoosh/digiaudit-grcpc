import type {
  CentralRiskCategorySummary,
  CentralRiskNodeKind,
  CentralRiskStatus,
  CentralRiskTemplateSummary,
} from "../domain/centralRisk.model";

export interface CentralRiskTreeNode {
  key: string;
  id: string;
  kind: CentralRiskNodeKind;
  code: string;
  title: string;
  status: CentralRiskStatus;
  sortOrder: number;
  parentCategoryId: string | null;
  children: CentralRiskTreeNode[];
}

export const riskNodeKey = (kind: CentralRiskNodeKind, id: string) => `${kind}:${id}`;

function compareNodes(left: CentralRiskTreeNode, right: CentralRiskTreeNode) {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  if (left.kind !== right.kind) return left.kind === "category" ? -1 : 1;
  return left.title.localeCompare(right.title, "fa");
}

export function buildRiskTree(
  categories: CentralRiskCategorySummary[],
  templates: CentralRiskTemplateSummary[],
): CentralRiskTreeNode[] {
  const categoriesByParent = new Map<string | null, CentralRiskCategorySummary[]>();
  const templatesByCategory = new Map<string, CentralRiskTemplateSummary[]>();

  categories.forEach((category) => {
    const siblings = categoriesByParent.get(category.parentCategoryId) ?? [];
    siblings.push(category);
    categoriesByParent.set(category.parentCategoryId, siblings);
  });
  templates.forEach((template) => {
    const siblings = templatesByCategory.get(template.riskCategoryId) ?? [];
    siblings.push(template);
    templatesByCategory.set(template.riskCategoryId, siblings);
  });

  const visitCategory = (
    category: CentralRiskCategorySummary,
    ancestors: Set<string>,
  ): CentralRiskTreeNode => {
    if (ancestors.has(category.id)) {
      return {
        key: riskNodeKey("category", category.id),
        id: category.id,
        kind: "category",
        code: category.code,
        title: category.title,
        status: category.status,
        sortOrder: category.sortOrder,
        parentCategoryId: category.parentCategoryId,
        children: [],
      };
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(category.id);
    const childCategories = (categoriesByParent.get(category.id) ?? []).map((child) =>
      visitCategory(child, nextAncestors),
    );
    const childTemplates = (templatesByCategory.get(category.id) ?? []).map(
      (template): CentralRiskTreeNode => ({
        key: riskNodeKey("template", template.id),
        id: template.id,
        kind: "template",
        code: template.code,
        title: template.title,
        status: template.status,
        sortOrder: template.sortOrder,
        parentCategoryId: template.riskCategoryId,
        children: [],
      }),
    );

    return {
      key: riskNodeKey("category", category.id),
      id: category.id,
      kind: "category",
      code: category.code,
      title: category.title,
      status: category.status,
      sortOrder: category.sortOrder,
      parentCategoryId: category.parentCategoryId,
      children: [...childCategories, ...childTemplates].sort(compareNodes),
    };
  };

  return (categoriesByParent.get(null) ?? [])
    .map((category) => visitCategory(category, new Set()))
    .sort(compareNodes);
}

function matches(node: CentralRiskTreeNode, normalized: string) {
  const haystack = `${node.code} ${node.title}`.toLocaleLowerCase("fa");
  return haystack.includes(normalized);
}

export function filterRiskTree(
  nodes: CentralRiskTreeNode[],
  searchText: string,
): CentralRiskTreeNode[] {
  const normalized = searchText.trim().toLocaleLowerCase("fa");
  if (!normalized) return nodes;

  return nodes.flatMap((node) => {
    const children = filterRiskTree(node.children, normalized);
    if (!matches(node, normalized) && children.length === 0) return [];
    return [{ ...node, children }];
  });
}

export function collectRiskAncestorKeys(
  categories: CentralRiskCategorySummary[],
  templates: CentralRiskTemplateSummary[],
  selectedKey: string | null | undefined,
): string[] {
  if (!selectedKey) return [];
  const [kind, id] = selectedKey.split(":", 2) as [CentralRiskNodeKind, string];
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const templateById = new Map(templates.map((template) => [template.id, template]));
  const result: string[] = [];

  let categoryId = kind === "template"
    ? templateById.get(id)?.riskCategoryId ?? null
    : categoryById.get(id)?.parentCategoryId ?? null;
  const visited = new Set<string>();
  while (categoryId && !visited.has(categoryId)) {
    visited.add(categoryId);
    result.push(riskNodeKey("category", categoryId));
    categoryId = categoryById.get(categoryId)?.parentCategoryId ?? null;
  }
  return result;
}

export function collectRiskCategoryDescendantIds(
  categories: CentralRiskCategorySummary[],
  categoryId: string | null | undefined,
): string[] {
  if (!categoryId) return [];
  const childrenByParent = new Map<string, string[]>();
  categories.forEach((category) => {
    if (!category.parentCategoryId) return;
    const children = childrenByParent.get(category.parentCategoryId) ?? [];
    children.push(category.id);
    childrenByParent.set(category.parentCategoryId, children);
  });

  const descendants: string[] = [];
  const stack = [...(childrenByParent.get(categoryId) ?? [])];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (!visited.add(id)) continue;
    descendants.push(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }
  return descendants;
}

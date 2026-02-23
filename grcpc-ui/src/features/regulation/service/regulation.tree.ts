import type { RegulationEntity, RegulationTreeNode } from "../model/regulation.types";
import { buildRegulationTree } from "../components/tree.utils";

export function toRegulationTree(items: RegulationEntity[]): RegulationTreeNode[] {
    return buildRegulationTree(items);
}
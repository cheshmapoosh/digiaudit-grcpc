package com.digiaudit.grcpc.modules.masterdata.ordering.domain;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import java.util.List;
import static com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType.*;

/** Closed registry for main-page display order only; never accepts SQL identifiers from clients. */
public enum CatalogDisplayOrder {
    ORGANIZATION("ORGANIZATION", MasterDataHierarchyKey.ORGANIZATION,
        new Node(RevisionEntityType.ORGANIZATION, "organization", "parent_organization_id", RevisionEntityType.ORGANIZATION)),
    PROCESS("PROCESS", MasterDataHierarchyKey.PROCESS,
        new Node(CENTRAL_PROCESS, "central_process", "parent_process_id", CENTRAL_PROCESS),
        new Node(CENTRAL_SUBPROCESS, "central_subprocess", "process_id", CENTRAL_PROCESS)),
    CONTROL("CONTROL", MasterDataHierarchyKey.CONTROL,
        new Node(CENTRAL_CONTROL_GROUP, "central_control_group", "parent_group_id", CENTRAL_CONTROL_GROUP),
        new Node(CENTRAL_CONTROL, "central_control", "control_group_id", CENTRAL_CONTROL_GROUP)),
    RISK("RISK", MasterDataHierarchyKey.RISK,
        new Node(CENTRAL_RISK_CATEGORY, "central_risk_category", "parent_category_id", CENTRAL_RISK_CATEGORY),
        new Node(CENTRAL_RISK_TEMPLATE, "central_risk_template", "risk_category_id", CENTRAL_RISK_CATEGORY)),
    REGULATION("GOVERNANCE", MasterDataHierarchyKey.REGULATION,
        new Node(CENTRAL_REGULATION_GROUP, "central_regulation_group", "parent_group_id", CENTRAL_REGULATION_GROUP),
        new Node(CENTRAL_REGULATION, "central_regulation", "regulation_group_id", CENTRAL_REGULATION_GROUP),
        new Node(CENTRAL_REGULATION_REQUIREMENT, "central_regulation_requirement", "regulation_id", CENTRAL_REGULATION)),
    POLICY("GOVERNANCE", MasterDataHierarchyKey.POLICY,
        new Node(CENTRAL_POLICY_GROUP, "central_policy_group", "parent_group_id", CENTRAL_POLICY_GROUP),
        new Node(CENTRAL_POLICY, "central_policy", "policy_group_id", CENTRAL_POLICY_GROUP)),
    ACCOUNT_GROUP("REFERENCE", MasterDataHierarchyKey.ACCOUNT_GROUP,
        new Node(CENTRAL_ACCOUNT_GROUP, "central_account_group", "parent_account_group_id", CENTRAL_ACCOUNT_GROUP)),
    OBJECTIVE("REFERENCE", MasterDataHierarchyKey.OBJECTIVE,
        new Node(RevisionEntityType.OBJECTIVE, "objective", "parent_objective_id", RevisionEntityType.OBJECTIVE)),
    GLOBAL_CONTROL("CONTROL", MasterDataHierarchyKey.GLOBAL_CONTROL,
        new Node(CONTROL_GROUP, "control_group", "parent_id", CONTROL_GROUP),
        new Node(RevisionEntityType.GLOBAL_CONTROL, "global_control", "control_group_id", CONTROL_GROUP));

    public record Node(RevisionEntityType type, String table, String parentColumn, RevisionEntityType parentType) {}
    private final String area;
    private final MasterDataHierarchyKey guard;
    private final List<Node> nodes;
    CatalogDisplayOrder(String area, MasterDataHierarchyKey guard, Node... nodes) {
        this.area = area; this.guard = guard; this.nodes = List.of(nodes);
    }
    public String area() { return area; }
    public MasterDataHierarchyKey guard() { return guard; }
    public List<Node> nodes() { return nodes; }
}

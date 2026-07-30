package com.digiaudit.grcpc.modules.masterdata.revision.domain;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;

public enum RevisionEntityType {
    ORGANIZATION("organization", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_PROCESS("central_process", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS("central_subprocess", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_CONTROL("central_control", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_CONTROL_OBJECTIVE("central_control_objective", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_RISK_CATEGORY("central_risk_category", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_RISK_TEMPLATE("central_risk_template", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_ACCOUNT_GROUP("central_account_group", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_REGULATION_GROUP("central_regulation_group", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_REGULATION("central_regulation", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_REGULATION_REQUIREMENT("central_regulation_requirement", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY_GROUP("central_policy_group", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY("central_policy", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY_VERSION("central_policy_version", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_CONTROL_SCOPE("central_subprocess_control_scope", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_RISK_SCOPE("central_subprocess_risk_scope", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE("central_subprocess_control_objective_scope", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_REQUIREMENT_SCOPE("central_subprocess_requirement_scope", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY_VERSION_SUBPROCESS_SCOPE("central_policy_version_subprocess_scope", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY_VERSION_CONTROL_SCOPE("central_policy_version_control_scope", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY_VERSION_REQUIREMENT_SCOPE("central_policy_version_requirement_scope", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_CONTROL_ACCOUNT_GROUP("central_control_account_group", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP("central_control_objective_account_group", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_RISK_CONTROL_COVERAGE("central_subprocess_risk_control_coverage", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE("central_subprocess_risk_control_objective_coverage", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE("central_subprocess_control_control_objective_coverage", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE("central_subprocess_requirement_control_coverage", EnumSet.of(RevisionDomain.CENTRAL)),
    LOCAL_ORGANIZATION_SUBPROCESS_SCOPE("local_organization_subprocess_scope", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_CONTROL_SCOPE("local_subprocess_control_scope", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_RISK_SCOPE("local_subprocess_risk_scope", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE("local_subprocess_control_objective_scope", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_REQUIREMENT_SCOPE("local_subprocess_requirement_scope", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_RISK_CONTROL_COVERAGE("local_subprocess_risk_control_coverage", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE("local_subprocess_risk_control_objective_coverage", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE("local_subprocess_control_control_objective_coverage", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE("local_subprocess_requirement_control_coverage", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_POLICY_ORGANIZATION_SCOPE("local_policy_organization_scope", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_POLICY_SUBPROCESS_SCOPE("local_policy_subprocess_scope", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_POLICY_CONTROL_SCOPE("local_policy_control_scope", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_POLICY_REQUIREMENT_SCOPE("local_policy_requirement_scope", EnumSet.of(RevisionDomain.LOCAL)),
    DOCUMENT_RETENTION_POLICY("document_retention_policy", EnumSet.of(RevisionDomain.CENTRAL)),
    DOCUMENT("document", EnumSet.of(RevisionDomain.CENTRAL, RevisionDomain.LOCAL)),
    DOCUMENT_VERSION("document_version", EnumSet.of(RevisionDomain.CENTRAL, RevisionDomain.LOCAL)),
    DOCUMENT_HOLD("document_hold", EnumSet.of(RevisionDomain.CENTRAL, RevisionDomain.LOCAL)),
    DOCUMENT_LINK("document_link", EnumSet.of(RevisionDomain.CENTRAL, RevisionDomain.LOCAL));

    private final String wireValue;
    private final Set<RevisionDomain> permittedDomains;

    RevisionEntityType(String wireValue, Set<RevisionDomain> permittedDomains) {
        this.wireValue = wireValue;
        this.permittedDomains = Set.copyOf(permittedDomains);
    }

    public String wireValue() {
        return wireValue;
    }

    public boolean isPermittedIn(RevisionDomain domain) {
        return permittedDomains.contains(domain);
    }

    public Set<RevisionDomain> permittedDomains() {
        return permittedDomains;
    }

    public static RevisionEntityType fromWireValue(String wireValue) {
        String normalized = wireValue == null ? "" : wireValue.toLowerCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(type -> type.wireValue.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown revision entity type: " + wireValue));
    }
}

package com.digiaudit.grcpc.modules.masterdata.revision.domain;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;

public enum RevisionEntityType {
    ORGANIZATION("ORG", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_PROCESS("CENTRAL_PROCESS", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS("CENTRAL_SUBPROCESS", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_CONTROL("CENTRAL_CONTROL", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_CONTROL_OBJECTIVE("CENTRAL_CONTROL_OBJECTIVE_DEF", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_RISK_CATEGORY("CENTRAL_RISK_CATEGORY", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_RISK_TEMPLATE("CENTRAL_RISK_TEMPLATE", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_ACCOUNT_GROUP("CENTRAL_ACCOUNT_GROUP", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_REGULATION_GROUP("CENTRAL_REGULATION_GROUP", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_REGULATION("CENTRAL_REGULATION", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_REGULATION_REQUIREMENT("CENTRAL_REQUIREMENT", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY_GROUP("CENTRAL_POLICY_GROUP", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY("CENTRAL_POLICY", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY_VERSION("CENTRAL_POLICY_VERSION", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_CONTROL_SCOPE("CENTRAL_CONTROL_SCOPE", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_RISK_SCOPE("CENTRAL_RISK_SCOPE", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE("CENTRAL_OBJECTIVE_SCOPE", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_REQUIREMENT_SCOPE("CENTRAL_REQUIREMENT_SCOPE", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY_VERSION_SUBPROCESS_SCOPE("CENTRAL_POLICY_SUBPROCESS", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY_VERSION_CONTROL_SCOPE("CENTRAL_POLICY_CONTROL", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_POLICY_VERSION_REQUIREMENT_SCOPE("CENTRAL_POLICY_REQUIREMENT", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_CONTROL_ACCOUNT_GROUP("CENTRAL_CONTROL_ACCOUNT_GROUP", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP("CENTRAL_OBJECTIVE_ACCOUNT_GROUP", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_RISK_CONTROL_COVERAGE("CENTRAL_RISK_CONTROL_COV", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE("CENTRAL_RISK_OBJECTIVE_COV", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE("CENTRAL_CONTROL_OBJECTIVE_COV", EnumSet.of(RevisionDomain.CENTRAL)),
    CENTRAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE("CENTRAL_REQUIREMENT_CONTROL_COV", EnumSet.of(RevisionDomain.CENTRAL)),
    LOCAL_ORGANIZATION_SUBPROCESS_SCOPE("LOCAL_CONTEXT", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_CONTROL_SCOPE("LOCAL_CONTROL_SCOPE", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_RISK_SCOPE("LOCAL_RISK_SCOPE", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE("LOCAL_OBJECTIVE_SCOPE", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_REQUIREMENT_SCOPE("LOCAL_REQUIREMENT_SCOPE", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_RISK_CONTROL_COVERAGE("LOCAL_RISK_CONTROL_COV", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE("LOCAL_RISK_OBJECTIVE_COV", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE("LOCAL_CONTROL_OBJECTIVE_COV", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE("LOCAL_REQUIREMENT_CONTROL_COV", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_POLICY_ORGANIZATION_SCOPE("LOCAL_POLICY_ORG", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_POLICY_SUBPROCESS_SCOPE("LOCAL_POLICY_SUBPROCESS", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_POLICY_CONTROL_SCOPE("LOCAL_POLICY_CONTROL", EnumSet.of(RevisionDomain.LOCAL)),
    LOCAL_POLICY_REQUIREMENT_SCOPE("LOCAL_POLICY_REQUIREMENT", EnumSet.of(RevisionDomain.LOCAL)),
    DOCUMENT_RETENTION_POLICY("DOCUMENT_RETENTION_POLICY", EnumSet.of(RevisionDomain.CENTRAL)),
    DOCUMENT("DOCUMENT", EnumSet.of(RevisionDomain.CENTRAL, RevisionDomain.LOCAL)),
    DOCUMENT_VERSION("DOCUMENT_VERSION", EnumSet.of(RevisionDomain.CENTRAL, RevisionDomain.LOCAL)),
    DOCUMENT_HOLD("DOCUMENT_HOLD", EnumSet.of(RevisionDomain.CENTRAL, RevisionDomain.LOCAL)),
    DOCUMENT_LINK("DOCUMENT_LINK", EnumSet.of(RevisionDomain.CENTRAL, RevisionDomain.LOCAL));

    private final String wireValue;
    private final Set<RevisionDomain> permittedDomains;

    RevisionEntityType(String wireValue, Set<RevisionDomain> permittedDomains) {
        if (wireValue.length() > 32) {
            throw new IllegalArgumentException("revision entity wireValue exceeds the documented 32 byte storage limit");
        }
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
        String normalized = wireValue == null ? "" : wireValue.trim().toUpperCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(type -> type.wireValue.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown revision entity type: " + wireValue));
    }
}

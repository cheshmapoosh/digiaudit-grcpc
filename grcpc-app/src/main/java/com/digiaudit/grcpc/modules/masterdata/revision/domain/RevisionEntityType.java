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
    DOCUMENT("DOCUMENT", EnumSet.of(RevisionDomain.CENTRAL, RevisionDomain.LOCAL)),
    DOCUMENT_VERSION("DOCUMENT_VERSION", EnumSet.of(RevisionDomain.CENTRAL, RevisionDomain.LOCAL)),
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

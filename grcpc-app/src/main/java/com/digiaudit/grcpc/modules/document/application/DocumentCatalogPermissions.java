package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;

final class DocumentCatalogPermissions {
    private DocumentCatalogPermissions() {}

    static String view(DocumentLinkTargetType type) {
        return switch (type) {
            case ORGANIZATION -> "ORGANIZATION_VIEW";
            case CENTRAL_PROCESS, CENTRAL_SUBPROCESS -> "PROCESS_VIEW";
            case CENTRAL_CONTROL -> "CENTRAL_CONTROL_VIEW";
            case CENTRAL_CONTROL_OBJECTIVE -> "CENTRAL_CONTROL_OBJECTIVE_VIEW";
            case CENTRAL_RISK_CATEGORY, CENTRAL_RISK_TEMPLATE -> "CENTRAL_RISK_VIEW";
            case CENTRAL_ACCOUNT_GROUP -> "CENTRAL_ACCOUNT_GROUP_VIEW";
            case CENTRAL_REGULATION_GROUP, CENTRAL_REGULATION, CENTRAL_REGULATION_REQUIREMENT -> "CENTRAL_REGULATION_VIEW";
            case CENTRAL_POLICY_GROUP, CENTRAL_POLICY, CENTRAL_POLICY_VERSION -> "CENTRAL_POLICY_VIEW";
            case MASTERDATA_REVISION -> throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed");
        };
    }

    static String mutate(DocumentLinkTargetType type) {
        return switch (type) {
            case ORGANIZATION -> "ORGANIZATION_EDIT";
            case CENTRAL_PROCESS, CENTRAL_SUBPROCESS -> "PROCESS_EDIT";
            case CENTRAL_CONTROL -> "CENTRAL_CONTROL_UPDATE";
            case CENTRAL_CONTROL_OBJECTIVE -> "CENTRAL_CONTROL_OBJECTIVE_UPDATE";
            case CENTRAL_RISK_CATEGORY, CENTRAL_RISK_TEMPLATE -> "CENTRAL_RISK_UPDATE";
            case CENTRAL_ACCOUNT_GROUP -> "CENTRAL_ACCOUNT_GROUP_UPDATE";
            case CENTRAL_REGULATION_GROUP, CENTRAL_REGULATION, CENTRAL_REGULATION_REQUIREMENT -> "CENTRAL_REGULATION_UPDATE";
            case CENTRAL_POLICY_GROUP, CENTRAL_POLICY, CENTRAL_POLICY_VERSION -> "CENTRAL_POLICY_UPDATE";
            case MASTERDATA_REVISION -> throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed");
        };
    }
}

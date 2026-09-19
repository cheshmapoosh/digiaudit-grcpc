package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Documents inherit the authorization area of their resolved, typed target. */
@Service
@RequiredArgsConstructor
public class DocumentAuthorizationService {
    private final MasterDataAuthorizationService authorization;

    public boolean canAccess(String targetType, UUID targetId, String permission) {
        if (targetId == null) return false;
        String area = switch (targetType) {
            case "ORG", "CENTRAL_ACCOUNT_GROUP" -> "REFERENCE";
            case "CENTRAL_PROCESS", "CENTRAL_SUBPROCESS" -> "PROCESS";
            case "CENTRAL_CONTROL", "CENTRAL_CONTROL_OBJECTIVE_DEF" -> "CONTROL";
            case "CENTRAL_RISK_CATEGORY", "CENTRAL_RISK_TEMPLATE" -> "RISK";
            case "CENTRAL_REGULATION_GROUP", "CENTRAL_REGULATION", "CENTRAL_REQUIREMENT",
                    "CENTRAL_POLICY_GROUP", "CENTRAL_POLICY", "CENTRAL_POLICY_VERSION" -> "GOVERNANCE";
            default -> null;
        };
        if (area == null) return false;
        if (permission.equals("DOCUMENT_VIEW") || permission.equals("DOCUMENT_DOWNLOAD")
                || permission.equals("MD_" + area + "_VIEW")) return authorization.canView(area);
        if (permission.equals("DOCUMENT_UPLOAD") || permission.equals("DOCUMENT_DELETE")
                || permission.equals("MD_" + area + "_MANAGE")) return authorization.canManage(area);
        return false;
    }

    public void assertCanAccess(String targetType, UUID targetId, String permission) {
        if (!canAccess(targetType, targetId, permission)) {
            throw new ForbiddenException("DOCUMENT_ACCESS_DENIED", "error.security.forbidden",
                    "Document target area access denied");
        }
    }
}

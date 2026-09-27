package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Documents inherit the authorization area of their resolved, typed target. */
@Service
@RequiredArgsConstructor
public class DocumentAuthorizationService {
    private final MasterDataAuthorizationService authorization;
    private final DocumentTargetContextResolver targetContextResolver;

    public boolean canAccess(String targetType, UUID targetId, String permission) {
        if (targetId == null || targetType == null || permission == null) return false;
        String[] localAreas = localAreas(targetType);
        if (localAreas != null) {
            boolean view = permission.equals("DOCUMENT_VIEW")
                    || permission.equals("DOCUMENT_DOWNLOAD")
                    || permission.equals("MD_REFERENCE_VIEW");
            boolean write = permission.equals("DOCUMENT_UPLOAD")
                    || permission.equals("DOCUMENT_DELETE")
                    || permission.equals("MD_REFERENCE_MANAGE");
            if (!view && !write) return false;
            if (write ? !authorization.canManage("REFERENCE")
                    : !authorization.canView("REFERENCE")) return false;
            for (String area : localAreas) {
                if (!authorization.canView(area)) return false;
            }
            try {
                targetContextResolver.resolvePublic(
                        DocumentLinkTargetType.fromPublicWireValue(targetType), targetId);
                return true;
            } catch (NotFoundException | IllegalArgumentException unavailable) {
                return false;
            }
        }
        String area = switch (targetType) {
            case "ORG", "CENTRAL_ACCOUNT_GROUP", "OBJECTIVE" -> "REFERENCE";
            case "CENTRAL_PROCESS", "CENTRAL_SUBPROCESS" -> "PROCESS";
            case "CENTRAL_CONTROL", "GLOBAL_CONTROL", "CENTRAL_CONTROL_OBJECTIVE_DEF" -> "CONTROL";
            case "CENTRAL_RISK_CATEGORY", "CENTRAL_RISK_TEMPLATE" -> "RISK";
            case "CENTRAL_REGULATION_GROUP", "CENTRAL_REGULATION", "CENTRAL_REQUIREMENT",
                    "CENTRAL_POLICY_GROUP", "CENTRAL_POLICY" -> "GOVERNANCE";
            default -> null;
        };
        if (area == null) return false;
        if (permission.equals("DOCUMENT_VIEW") || permission.equals("DOCUMENT_DOWNLOAD")
                || permission.equals("MD_" + area + "_VIEW")) return authorization.canView(area);
        if (permission.equals("DOCUMENT_UPLOAD") || permission.equals("DOCUMENT_DELETE")
                || permission.equals("MD_" + area + "_MANAGE")) return authorization.canManage(area);
        return false;
    }

    private String[] localAreas(String targetType) {
        return switch (targetType) {
            case "LOCAL_CONTEXT" -> new String[] {"PROCESS"};
            case "LOCAL_CONTROL_SCOPE" -> new String[] {"PROCESS", "CONTROL"};
            case "LOCAL_RISK_SCOPE" -> new String[] {"PROCESS", "RISK"};
            case "LOCAL_OBJECTIVE_SCOPE" -> new String[] {"PROCESS", "CONTROL"};
            case "LOCAL_REQUIREMENT_SCOPE" -> new String[] {"PROCESS", "GOVERNANCE"};
            case "LOCAL_RISK_CONTROL_COV", "LOCAL_RISK_OBJECTIVE_COV" ->
                    new String[] {"PROCESS", "RISK", "CONTROL"};
            case "LOCAL_CONTROL_OBJECTIVE_COV" -> new String[] {"PROCESS", "CONTROL"};
            case "LOCAL_REQUIREMENT_CONTROL_COV" ->
                    new String[] {"PROCESS", "GOVERNANCE", "CONTROL"};
            case "LOCAL_POLICY_ORG" -> new String[] {"GOVERNANCE"};
            case "LOCAL_POLICY_SUBPROCESS" -> new String[] {"PROCESS", "GOVERNANCE"};
            case "LOCAL_POLICY_CONTROL" -> new String[] {"PROCESS", "CONTROL", "GOVERNANCE"};
            case "LOCAL_POLICY_REQUIREMENT" -> new String[] {"PROCESS", "GOVERNANCE"};
            default -> null;
        };
    }

    public void assertCanAccess(String targetType, UUID targetId, String permission) {
        if (!canAccess(targetType, targetId, permission)) {
            throw new ForbiddenException("DOCUMENT_ACCESS_DENIED", "error.security.forbidden",
                    "Document target area access denied");
        }
    }
}

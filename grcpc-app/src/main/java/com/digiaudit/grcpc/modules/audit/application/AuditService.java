package com.digiaudit.grcpc.modules.audit.application;

import com.digiaudit.grcpc.modules.audit.domain.entity.AuditLogEntity;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.audit.domain.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public void log(
            AuditEventType eventType,
            AuditTargetType targetType,
            String targetId,
            ActionResult actionResult,
            UUID actorUserId,
            HttpServletRequest request,
            Map<String, Object> details
    ) {
        Map<String, Object> safeDetails = details == null ? new HashMap<>() : new HashMap<>(details);
        log.debug("Persisting audit event. eventType={}, targetType={}, targetId={}, actorUserId={}", eventType, targetType, targetId, actorUserId);
        AuditLogEntity entity = AuditLogEntity.builder()
                .eventType(eventType)
                .targetType(targetType)
                .targetId(targetId)
                .actionResult(actionResult)
                .actorUserId(actorUserId)
                .ipAddress(request != null ? request.getRemoteAddr() : null)
                .userAgent(request != null ? request.getHeader("User-Agent") : null)
                .detailsJson(safeDetails)
                .build();
        auditLogRepository.save(entity);
    }
}

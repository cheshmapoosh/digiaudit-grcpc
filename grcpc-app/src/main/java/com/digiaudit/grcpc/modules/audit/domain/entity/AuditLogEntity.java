package com.digiaudit.grcpc.modules.audit.domain.entity;

import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLogEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 100)
    private AuditEventType eventType;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 100)
    private AuditTargetType targetType;

    @Column(name = "target_id", length = 100)
    private String targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_result", nullable = false, length = 50)
    private ActionResult actionResult;

    @CreationTimestamp
    @Column(name = "event_time", nullable = false, updatable = false)
    private Instant eventTime;

    @Column(name = "ip_address", length = 100)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details_json", nullable = false)
    private Map<String, Object> detailsJson;
}

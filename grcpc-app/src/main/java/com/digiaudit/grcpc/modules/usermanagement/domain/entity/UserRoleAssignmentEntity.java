package com.digiaudit.grcpc.modules.usermanagement.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_role_assignment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class UserRoleAssignmentEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUserEntity user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleEntity role;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", nullable = false, length = 50)
    private ScopeType scopeType;

    @Column(name = "scope_org_unit_id")
    private UUID scopeOrgUnitId;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @Column(name = "assigned_by")
    private UUID assignedBy;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "active", nullable = false)
    private boolean active;
}

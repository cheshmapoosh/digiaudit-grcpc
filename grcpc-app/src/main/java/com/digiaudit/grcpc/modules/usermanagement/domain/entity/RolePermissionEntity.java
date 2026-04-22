package com.digiaudit.grcpc.modules.usermanagement.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(
        name = "role_permission",
        uniqueConstraints = @UniqueConstraint(name = "uk_role_permission_role_permission", columnNames = {"role_id", "permission_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class RolePermissionEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleEntity role;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "permission_id", nullable = false)
    private PermissionEntity permission;

}

package com.digiaudit.grcpc.modules.usermanagement.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
        name = "delegation_assignable_role",
        uniqueConstraints = @UniqueConstraint(name = "uk_delegation_assignable_role_policy_role", columnNames = {"delegation_policy_id", "assignable_role_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DelegationAssignableRoleEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delegation_policy_id", nullable = false)
    private DelegationPolicyEntity delegationPolicy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignable_role_id", nullable = false)
    private RoleEntity assignableRole;
}

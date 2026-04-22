package com.digiaudit.grcpc.modules.usermanagement.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ManageableUserMode;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.SubjectType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "delegation_policy")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class DelegationPolicyEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "subject_type", nullable = false, length = 20)
    private SubjectType subjectType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_role_id")
    private RoleEntity subjectRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_user_id")
    private AppUserEntity subjectUser;

    @Column(name = "allow_create_user", nullable = false)
    private boolean allowCreateUser;

    @Column(name = "allow_edit_user", nullable = false)
    private boolean allowEditUser;

    @Column(name = "allow_disable_user", nullable = false)
    private boolean allowDisableUser;

    @Column(name = "allow_assign_roles", nullable = false)
    private boolean allowAssignRoles;

    @Column(name = "allow_create_role", nullable = false)
    private boolean allowCreateRole;

    @Column(name = "allow_edit_role", nullable = false)
    private boolean allowEditRole;

    @Column(name = "allow_assign_business_permissions", nullable = false)
    private boolean allowAssignBusinessPermissions;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", nullable = false, length = 50)
    private ScopeType scopeType;

    @Column(name = "scope_org_unit_id")
    private UUID scopeOrgUnitId;

    @Column(name = "allow_subtree", nullable = false)
    private boolean allowSubtree;

    @Enumerated(EnumType.STRING)
    @Column(name = "manageable_user_mode", nullable = false, length = 50)
    private ManageableUserMode manageableUserMode;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;
}

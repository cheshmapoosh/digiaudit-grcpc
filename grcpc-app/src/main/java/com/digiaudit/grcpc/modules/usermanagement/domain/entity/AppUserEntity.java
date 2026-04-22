package com.digiaudit.grcpc.modules.usermanagement.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_user")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class AppUserEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "username", nullable = false, length = 100, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 200)
    private String passwordHash;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "mobile", length = 20)
    private String mobile;

    @Column(name = "email", length = 200)
    private String email;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "locked", nullable = false)
    private boolean locked;

    @Column(name = "root_user", nullable = false)
    private boolean rootUser;

    @Column(name = "default_org_unit_id")
    private UUID defaultOrgUnitId;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;


}

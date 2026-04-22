package com.digiaudit.grcpc.modules.usermanagement.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "role")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class RoleEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "code", nullable = false, length = 100, unique = true)
    private String code;

    @Column(name = "system_defined", nullable = false)
    private boolean systemDefined;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Builder.Default
    @OneToMany(mappedBy = "role", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<RoleI18nEntity> translations = new LinkedHashSet<>();
}

package com.digiaudit.grcpc.modules.usermanagement.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "business_permission")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class BusinessPermissionEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "code", nullable = false, length = 100, unique = true)
    private String code;

    @Column(name = "module_name", nullable = false, length = 100)
    private String moduleName;

    @Builder.Default
    @OneToMany(mappedBy = "businessPermission", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<BusinessPermissionI18nEntity> translations = new LinkedHashSet<>();
}

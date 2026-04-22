package com.digiaudit.grcpc.modules.usermanagement.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
        name = "business_permission_i18n",
        uniqueConstraints = @UniqueConstraint(name = "uk_business_permission_i18n_permission_locale", columnNames = {"business_permission_id", "locale"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessPermissionI18nEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_permission_id", nullable = false)
    private BusinessPermissionEntity businessPermission;

    @Column(name = "locale", nullable = false, length = 10)
    private String locale;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", length = 1000)
    private String description;
}

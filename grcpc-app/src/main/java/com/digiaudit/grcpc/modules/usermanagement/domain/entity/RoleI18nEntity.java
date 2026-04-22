package com.digiaudit.grcpc.modules.usermanagement.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
        name = "role_i18n",
        uniqueConstraints = @UniqueConstraint(name = "uk_role_i18n_role_locale", columnNames = {"role_id", "locale"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleI18nEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleEntity role;

    @Column(name = "locale", nullable = false, length = 10)
    private String locale;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", length = 1000)
    private String description;

}

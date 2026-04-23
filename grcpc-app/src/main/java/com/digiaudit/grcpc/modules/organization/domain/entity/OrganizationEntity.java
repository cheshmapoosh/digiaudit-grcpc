package com.digiaudit.grcpc.modules.organization.domain.entity;

import com.digiaudit.grcpc.modules.organization.domain.enums.OrganizationStatus;
import com.digiaudit.grcpc.modules.organization.domain.enums.OrganizationType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
        name = "organization",
        indexes = {
                @Index(name = "idx_organization_parent_id", columnList = "parent_id"),
                @Index(name = "idx_organization_status", columnList = "status"),
                @Index(name = "idx_organization_type", columnList = "type"),
                @Index(name = "idx_organization_name", columnList = "name")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_organization_code", columnNames = "code")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizationEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "parent_id")
    private UUID parentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private OrganizationType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private OrganizationStatus status;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

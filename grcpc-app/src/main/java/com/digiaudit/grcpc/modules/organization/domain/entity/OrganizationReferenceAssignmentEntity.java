package com.digiaudit.grcpc.modules.organization.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "organization_reference_assignment",
        indexes = {
                @Index(name = "idx_org_ref_asg_org", columnList = "organization_id"),
                @Index(name = "idx_org_ref_asg_type", columnList = "reference_type"),
                @Index(name = "idx_org_ref_asg_ref", columnList = "reference_id"),
                @Index(name = "idx_org_ref_asg_active", columnList = "active")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_org_ref_assignment",
                columnNames = {"organization_id", "reference_type", "reference_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class OrganizationReferenceAssignmentEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "reference_type", nullable = false, length = 50)
    private String referenceType;

    @Column(name = "reference_id", nullable = false)
    private UUID referenceId;

    @Column(name = "assignment_type", nullable = false, length = 50)
    private String assignmentType;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "active", nullable = false)
    private boolean active;
}

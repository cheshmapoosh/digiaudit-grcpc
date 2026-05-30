package com.digiaudit.grcpc.modules.organization.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "organization_process_assignment",
        indexes = {
                @Index(name = "idx_org_process_assignment_org", columnList = "organization_id"),
                @Index(name = "idx_org_process_assignment_process", columnList = "process_node_id"),
                @Index(name = "idx_org_process_assignment_active", columnList = "active")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_org_process_assignment", columnNames = {"organization_id", "process_node_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class OrganizationProcessAssignmentEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "process_node_id", nullable = false)
    private UUID processNodeId;

    @Column(name = "assignment_type", nullable = false, length = 50)
    private String assignmentType;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "active", nullable = false)
    private boolean active;
}

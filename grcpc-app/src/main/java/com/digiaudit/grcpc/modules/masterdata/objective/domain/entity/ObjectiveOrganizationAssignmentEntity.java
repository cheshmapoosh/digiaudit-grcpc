package com.digiaudit.grcpc.modules.masterdata.objective.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "objective_organization_assignment",
        indexes = {
                @Index(name = "idx_obj_org_asg_objective", columnList = "objective_node_id"),
                @Index(name = "idx_obj_org_asg_organization", columnList = "organization_id"),
                @Index(name = "idx_obj_org_asg_active", columnList = "active")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_objective_organization_assignment",
                columnNames = {"objective_node_id", "organization_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ObjectiveOrganizationAssignmentEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "objective_node_id", nullable = false)
    private UUID objectiveNodeId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "active", nullable = false)
    private boolean active;
}

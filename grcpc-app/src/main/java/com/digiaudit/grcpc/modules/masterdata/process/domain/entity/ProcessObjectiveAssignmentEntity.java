package com.digiaudit.grcpc.modules.masterdata.process.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "process_objective_assignment",
        indexes = {
                @Index(name = "idx_proc_obj_asg_process", columnList = "process_node_id"),
                @Index(name = "idx_proc_obj_asg_objective", columnList = "objective_node_id"),
                @Index(name = "idx_proc_obj_asg_active", columnList = "active")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_process_objective_assignment", columnNames = {"process_node_id", "objective_node_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ProcessObjectiveAssignmentEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "process_node_id", nullable = false)
    private UUID processNodeId;

    @Column(name = "objective_node_id", nullable = false)
    private UUID objectiveNodeId;

    @Column(name = "assignment_type", nullable = false, length = 50)
    private String assignmentType;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "active", nullable = false)
    private boolean active;
}

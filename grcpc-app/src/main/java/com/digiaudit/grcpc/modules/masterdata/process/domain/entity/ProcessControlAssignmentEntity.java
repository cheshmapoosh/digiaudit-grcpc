package com.digiaudit.grcpc.modules.masterdata.process.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "process_control_assignment",
        indexes = {
                @Index(name = "idx_process_control_assignment_process", columnList = "process_node_id"),
                @Index(name = "idx_process_control_assignment_control", columnList = "control_id"),
                @Index(name = "idx_process_control_assignment_active", columnList = "active")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_process_control_assignment", columnNames = {"process_node_id", "control_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ProcessControlAssignmentEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "process_node_id", nullable = false)
    private UUID processNodeId;

    @Column(name = "control_id", nullable = false)
    private UUID controlId;

    @Column(name = "assignment_type", nullable = false, length = 50)
    private String assignmentType;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "active", nullable = false)
    private boolean active;
}

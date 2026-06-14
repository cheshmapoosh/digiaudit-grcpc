package com.digiaudit.grcpc.modules.masterdata.process.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "process_regulation_assignment",
        indexes = {
                @Index(name = "idx_proc_reg_asg_process", columnList = "process_node_id"),
                @Index(name = "idx_proc_reg_asg_regulation", columnList = "regulation_node_id"),
                @Index(name = "idx_proc_reg_asg_active", columnList = "active")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_process_regulation_assignment", columnNames = {"process_node_id", "regulation_node_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ProcessRegulationAssignmentEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "process_node_id", nullable = false)
    private UUID processNodeId;

    @Column(name = "regulation_node_id", nullable = false)
    private UUID regulationNodeId;

    @Column(name = "active", nullable = false)
    private boolean active;
}

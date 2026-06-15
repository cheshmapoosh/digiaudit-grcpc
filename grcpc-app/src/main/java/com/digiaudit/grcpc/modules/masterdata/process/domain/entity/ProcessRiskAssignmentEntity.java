package com.digiaudit.grcpc.modules.masterdata.process.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "process_risk_assignment",
        indexes = {
                @Index(name = "idx_proc_risk_asg_process", columnList = "process_node_id"),
                @Index(name = "idx_proc_risk_asg_risk", columnList = "risk_node_id"),
                @Index(name = "idx_proc_risk_asg_active", columnList = "active")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_process_risk_assignment", columnNames = {"process_node_id", "risk_node_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ProcessRiskAssignmentEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "process_node_id", nullable = false)
    private UUID processNodeId;

    @Column(name = "risk_node_id", nullable = false)
    private UUID riskNodeId;

    @Column(name = "assignment_type", nullable = false, length = 50)
    private String assignmentType;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "active", nullable = false)
    private boolean active;
}

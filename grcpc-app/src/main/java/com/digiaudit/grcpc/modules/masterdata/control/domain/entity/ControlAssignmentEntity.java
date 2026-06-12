package com.digiaudit.grcpc.modules.masterdata.control.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import com.digiaudit.grcpc.modules.masterdata.control.domain.enums.ControlAssignmentStatus;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "control_assignment",
        indexes = {
                @Index(name = "idx_control_assignment_control", columnList = "control_id"),
                @Index(name = "idx_control_assignment_sub_process", columnList = "sub_process_id"),
                @Index(name = "idx_control_assignment_status", columnList = "assignment_status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ControlAssignmentEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "control_id", nullable = false)
    private UUID controlId;

    @Column(name = "sub_process_id", nullable = false)
    private UUID subProcessId;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "owner_name", length = 255)
    private String ownerName;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "operation_period", length = 255)
    private String operationPeriod;

    @Column(name = "test_method", length = 255)
    private String testMethod;

    @Column(name = "test_plan", length = 2000)
    private String testPlan;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_status", nullable = false, length = 50)
    private ControlAssignmentStatus assignmentStatus;
}

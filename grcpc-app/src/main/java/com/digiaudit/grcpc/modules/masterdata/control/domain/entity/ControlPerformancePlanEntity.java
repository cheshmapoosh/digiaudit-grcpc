package com.digiaudit.grcpc.modules.masterdata.control.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "control_performance_plan",
        indexes = {
                @Index(name = "idx_control_perf_assignment", columnList = "control_assignment_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ControlPerformancePlanEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "control_assignment_id", nullable = false)
    private UUID controlAssignmentId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "frequency", length = 100)
    private String frequency;

    @Column(name = "owner_name", length = 255)
    private String ownerName;

    @Column(name = "planned_date")
    private LocalDate plannedDate;

    @Column(name = "status", length = 50)
    private String status;
}

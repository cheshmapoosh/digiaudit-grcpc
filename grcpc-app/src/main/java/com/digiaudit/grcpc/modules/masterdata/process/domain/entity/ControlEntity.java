package com.digiaudit.grcpc.modules.masterdata.process.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "control",
        indexes = {
                @Index(name = "idx_control_status", columnList = "status"),
                @Index(name = "idx_control_title", columnList = "title"),
                @Index(name = "idx_control_objective_id", columnList = "control_objective_id")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_control_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ControlEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "status", nullable = false, length = 50)
    private String status;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "owner_name", length = 255)
    private String ownerName;

    @Column(name = "documents_count", nullable = false)
    private Integer documentsCount;

    @Column(name = "control_objective_id")
    private UUID controlObjectiveId;

    @Column(name = "control_automation", length = 50)
    private String controlAutomation;

    @Column(name = "control_frequency", length = 255)
    private String controlFrequency;

    @Column(name = "control_classification", length = 255)
    private String controlClassification;

    @Column(name = "control_owner", length = 255)
    private String controlOwner;

    @Column(name = "test_direction", length = 255)
    private String testDirection;

    @Column(name = "test_type", length = 255)
    private String testType;

    @Column(name = "test_program", length = 2000)
    private String testProgram;

    @Column(name = "importance", length = 50)
    private String importance;
}

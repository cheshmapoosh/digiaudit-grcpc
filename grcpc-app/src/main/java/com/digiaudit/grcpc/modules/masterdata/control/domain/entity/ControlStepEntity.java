package com.digiaudit.grcpc.modules.masterdata.control.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "control_step",
        indexes = {
                @Index(name = "idx_control_step_assignment", columnList = "control_assignment_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ControlStepEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "control_assignment_id", nullable = false)
    private UUID controlAssignmentId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "required_document", length = 1000)
    private String requiredDocument;

    @Column(name = "required_note", length = 1000)
    private String requiredNote;

    @Column(name = "sensitivity", length = 100)
    private String sensitivity;

    @Column(name = "sort_order")
    private Integer sortOrder;
}

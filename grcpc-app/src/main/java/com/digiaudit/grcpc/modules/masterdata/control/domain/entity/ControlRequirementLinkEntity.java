package com.digiaudit.grcpc.modules.masterdata.control.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "control_requirement_link",
        indexes = {
                @Index(name = "idx_ctl_req_link_assignment", columnList = "control_assignment_id"),
                @Index(name = "idx_ctl_req_link_requirement", columnList = "requirement_id"),
                @Index(name = "idx_ctl_req_link_regulation", columnList = "regulation_id")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_ctl_req_link",
                columnNames = {"control_assignment_id", "requirement_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ControlRequirementLinkEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "control_assignment_id", nullable = false)
    private UUID controlAssignmentId;

    @Column(name = "requirement_id", nullable = false)
    private UUID requirementId;

    @Column(name = "regulation_id")
    private UUID regulationId;

    @Column(name = "code", length = 50)
    private String code;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "regulation_title", length = 255)
    private String regulationTitle;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;
}

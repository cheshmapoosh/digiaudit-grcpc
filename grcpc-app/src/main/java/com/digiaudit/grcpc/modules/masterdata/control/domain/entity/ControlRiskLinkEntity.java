package com.digiaudit.grcpc.modules.masterdata.control.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "control_risk_link",
        indexes = {
                @Index(name = "idx_ctl_risk_link_assignment", columnList = "control_assignment_id"),
                @Index(name = "idx_ctl_risk_link_risk", columnList = "risk_id")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_ctl_risk_link",
                columnNames = {"control_assignment_id", "risk_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ControlRiskLinkEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "control_assignment_id", nullable = false)
    private UUID controlAssignmentId;

    @Column(name = "risk_id", nullable = false)
    private UUID riskId;

    @Column(name = "code", length = 50)
    private String code;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "source", length = 255)
    private String source;

    @Column(name = "organization_title", length = 255)
    private String organizationTitle;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;
}

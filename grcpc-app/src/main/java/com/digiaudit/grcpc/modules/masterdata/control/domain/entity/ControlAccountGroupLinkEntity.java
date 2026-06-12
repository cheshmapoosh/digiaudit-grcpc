package com.digiaudit.grcpc.modules.masterdata.control.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "control_account_group_link",
        indexes = {
                @Index(name = "idx_ctl_acc_link_assignment", columnList = "control_assignment_id"),
                @Index(name = "idx_ctl_acc_link_group", columnList = "account_group_id")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_ctl_acc_link",
                columnNames = {"control_assignment_id", "account_group_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ControlAccountGroupLinkEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "control_assignment_id", nullable = false)
    private UUID controlAssignmentId;

    @Column(name = "account_group_id", nullable = false)
    private UUID accountGroupId;

    @Column(name = "code", length = 50)
    private String code;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "assertion_type", length = 255)
    private String assertionType;
}

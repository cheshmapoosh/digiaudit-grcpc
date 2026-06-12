package com.digiaudit.grcpc.modules.masterdata.control.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import com.digiaudit.grcpc.modules.masterdata.control.domain.enums.ControlAutomationType;
import com.digiaudit.grcpc.modules.masterdata.control.domain.enums.ControlImportance;
import com.digiaudit.grcpc.modules.masterdata.control.domain.enums.ControlNature;
import com.digiaudit.grcpc.modules.masterdata.control.domain.enums.ControlStatus;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "control",
        indexes = {
                @Index(name = "idx_control_status", columnList = "status"),
                @Index(name = "idx_control_name", columnList = "name")
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

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "control_class", length = 255)
    private String controlClass;

    @Enumerated(EnumType.STRING)
    @Column(name = "control_nature", length = 50)
    private ControlNature controlNature;

    @Enumerated(EnumType.STRING)
    @Column(name = "automation_type", length = 50)
    private ControlAutomationType automationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "importance", length = 50)
    private ControlImportance importance;

    @Column(name = "objective", length = 2000)
    private String objective;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private ControlStatus status;
}

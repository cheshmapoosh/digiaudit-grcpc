package com.digiaudit.grcpc.modules.masterdata.objective.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "objective_node",
        indexes = {
                @Index(name = "idx_objective_node_parent_id", columnList = "parent_id"),
                @Index(name = "idx_objective_node_status", columnList = "status")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_objective_node_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ObjectiveNodeEntity extends AuditableEntity {
    @Id
    @GeneratedValue
    private UUID id;
    @Column(name = "code", nullable = false, length = 50)
    private String code;
    @Column(name = "title", nullable = false, length = 255)
    private String title;
    @Column(name = "node_type", nullable = false, length = 50)
    private String nodeType;
    @Column(name = "parent_id")
    private UUID parentId;
    @Column(name = "status", nullable = false, length = 50)
    private String status;
    @Column(name = "sort_order")
    private Integer sortOrder;
    @Column(name = "description", length = 2000)
    private String description;
    @Column(name = "strategy", length = 2000)
    private String strategy;
    @Column(name = "objective_type", length = 50)
    private String objectiveType;
    @Column(name = "objective_class", length = 255)
    private String objectiveClass;
    @Column(name = "organization_unit_id")
    private UUID organizationUnitId;
    @Column(name = "organization_unit_name", length = 255)
    private String organizationUnitName;
    @Column(name = "effective_from")
    private LocalDate effectiveFrom;
    @Column(name = "valid_until")
    private LocalDate validUntil;
    @Column(name = "documents_count", nullable = false)
    private Integer documentsCount;
}

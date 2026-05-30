package com.digiaudit.grcpc.modules.masterdata.risk.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.converter.RiskEffectListConverter;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.value.RiskEffectValue;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "risk_node",
        indexes = {
                @Index(name = "idx_risk_node_parent_id", columnList = "parent_id"),
                @Index(name = "idx_risk_node_status", columnList = "status"),
                @Index(name = "idx_risk_node_type", columnList = "node_type")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_risk_node_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class RiskNodeEntity extends AuditableEntity {

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

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "allow_reference")
    private Boolean allowReference;

    @Column(name = "analysis_profile", length = 255)
    private String analysisProfile;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "owner_name", length = 255)
    private String ownerName;

    @Column(name = "documents_count", nullable = false)
    private Integer documentsCount;

    @Column(name = "company_operation", length = 255)
    private String companyOperation;

    @Column(name = "risk_type", length = 50)
    private String riskType;

    @Column(name = "causes", length = 2000)
    private String causes;

    @Convert(converter = RiskEffectListConverter.class)
    @Column(name = "effects_json", columnDefinition = "clob")
    private List<RiskEffectValue> effects;

    @Column(name = "existing_risks_count", nullable = false)
    private Integer existingRisksCount;

    @Column(name = "response_patterns_count", nullable = false)
    private Integer responsePatternsCount;

    @Column(name = "control_centers_count", nullable = false)
    private Integer controlCentersCount;
}

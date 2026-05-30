package com.digiaudit.grcpc.modules.masterdata.policy.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "policy_node",
        indexes = {
                @Index(name = "idx_policy_node_parent_id", columnList = "parent_id"),
                @Index(name = "idx_policy_node_status", columnList = "status")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_policy_node_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class PolicyNodeEntity extends AuditableEntity {
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
    @Column(name = "policy_category", length = 50)
    private String policyCategory;
    @Column(name = "policy_kind", length = 50)
    private String policyKind;
    @Column(name = "owner_id")
    private UUID ownerId;
    @Column(name = "owner_name", length = 255)
    private String ownerName;
    @Column(name = "owner_organization", length = 255)
    private String ownerOrganization;
    @Column(name = "creator_name", length = 255)
    private String creatorName;
    @Column(name = "documents_count", nullable = false)
    private Integer documentsCount;
    @Column(name = "policy_version", length = 255)
    private String policyVersion;
    @Column(name = "valid_from")
    private LocalDate validFrom;
    @Column(name = "valid_to")
    private LocalDate validTo;
    @Column(name = "next_review_date")
    private LocalDate nextReviewDate;
    @Column(name = "communication_method", length = 50)
    private String communicationMethod;
    @Column(name = "communication_language", length = 255)
    private String communicationLanguage;
    @Column(name = "objective", length = 2000)
    private String objective;
    @Column(name = "note", length = 2000)
    private String note;
    @Column(name = "evaluation_confirmed")
    private Boolean evaluationConfirmed;
}

package com.digiaudit.grcpc.modules.regulation.domain.entity;

import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
        name = "regulation",
        indexes = {
                @Index(name = "idx_regulation_parent_id", columnList = "parent_id"),
                @Index(name = "idx_regulation_node_type", columnList = "node_type"),
                @Index(name = "idx_regulation_status", columnList = "status"),
                @Index(name = "idx_regulation_title", columnList = "title")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_regulation_code", columnNames = "code")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegulationEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "parent_id")
    private UUID parentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "node_type", nullable = false, length = 50)
    private RegulationNodeType nodeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private RegulationStatus status;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

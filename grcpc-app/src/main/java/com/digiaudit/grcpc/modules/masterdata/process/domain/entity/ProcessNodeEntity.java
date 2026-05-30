package com.digiaudit.grcpc.modules.masterdata.process.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "process_node",
        indexes = {
                @Index(name = "idx_process_node_parent_id", columnList = "parent_id"),
                @Index(name = "idx_process_node_status", columnList = "status"),
                @Index(name = "idx_process_node_type", columnList = "node_type")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_process_node_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ProcessNodeEntity extends AuditableEntity {

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

    @Column(name = "process_category", length = 50)
    private String processCategory;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "owner_name", length = 255)
    private String ownerName;

    @Column(name = "documents_count", nullable = false)
    private Integer documentsCount;

    @Column(name = "objective", length = 2000)
    private String objective;

    @Column(name = "operation_cycle", length = 255)
    private String operationCycle;
}

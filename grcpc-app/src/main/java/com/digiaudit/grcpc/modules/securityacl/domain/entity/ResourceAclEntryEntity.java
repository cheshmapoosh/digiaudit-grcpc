package com.digiaudit.grcpc.modules.securityacl.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "resource_acl_entry",
        indexes = {
                @Index(name = "idx_resource_acl_target", columnList = "target_type,target_id"),
                @Index(name = "idx_resource_acl_subject", columnList = "subject_type,subject_id"),
                @Index(name = "idx_resource_acl_permission", columnList = "permission_code")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_resource_acl_entry",
                columnNames = {"target_type", "target_id", "subject_type", "subject_id", "permission_code"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ResourceAclEntryEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "target_type", nullable = false, length = 100)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Column(name = "subject_type", nullable = false, length = 50)
    private String subjectType;

    @Column(name = "subject_id", nullable = false)
    private UUID subjectId;

    @Column(name = "permission_code", nullable = false, length = 100)
    private String permissionCode;

    @Column(name = "effect", nullable = false, length = 50)
    private String effect;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;
}

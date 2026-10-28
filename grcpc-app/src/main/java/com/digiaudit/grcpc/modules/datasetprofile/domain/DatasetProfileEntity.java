package com.digiaudit.grcpc.modules.datasetprofile.domain;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity @Table(name = "dataset_profile")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class DatasetProfileEntity extends AuditableEntity {
    @Id @JdbcTypeCode(SqlTypes.BINARY) @Column(columnDefinition = "RAW(16)") private UUID id;
    @Column(nullable = false, length = 255) private String name;
    @Lob @Column(columnDefinition = "CLOB") private String description;
    @Builder.Default @Column(name = "color_name", nullable = false, length = 32) private String colorName = "blue";
    @Builder.Default @Column(name = "icon_name", nullable = false, length = 64) private String iconName = "building";
    @Column(nullable = false, length = 32) private String status;
    @Column(name = "deleted_at") private LocalDateTime deletedAt;
    @Column(name = "deleted_by") private UUID deletedBy;
}

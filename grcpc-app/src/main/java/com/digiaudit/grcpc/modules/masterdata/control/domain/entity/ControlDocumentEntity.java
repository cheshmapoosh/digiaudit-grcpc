package com.digiaudit.grcpc.modules.masterdata.control.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "control_document",
        indexes = {
                @Index(name = "idx_control_doc_assignment", columnList = "control_assignment_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class ControlDocumentEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "control_assignment_id", nullable = false)
    private UUID controlAssignmentId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "document_type", length = 100)
    private String documentType;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "file_ref", length = 1000)
    private String fileRef;
}

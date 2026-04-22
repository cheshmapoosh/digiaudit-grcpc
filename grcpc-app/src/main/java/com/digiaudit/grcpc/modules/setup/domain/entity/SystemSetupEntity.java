package com.digiaudit.grcpc.modules.setup.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "system_setup")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSetupEntity extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "initialized", nullable = false)
    private boolean initialized;

    @Column(name = "initialized_at")
    private Instant initializedAt;

    @Column(name = "initialized_by_user_id")
    private UUID initializedByUserId;

}

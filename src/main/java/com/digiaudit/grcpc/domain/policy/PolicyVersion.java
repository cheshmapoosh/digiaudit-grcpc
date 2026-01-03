package com.digiaudit.grcpc.domain.policy;

import com.digiaudit.grcpc.domain.common.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "policy_version", schema = "grcpc")
public class PolicyVersion extends BaseEntity {

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "status", nullable = false)
    private String status; // DRAFT, ACTIVE, OBSOLETE

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_id", nullable = false)
    private Policy policy;
}

package com.digiaudit.grcpc.domain.policy;

import com.digiaudit.grcpc.domain.common.BaseEntity;
import com.digiaudit.grcpc.domain.common.MasterDataContext;
import jakarta.persistence.*;

@Entity
@Table(name = "policy", schema = "grcpc")
public class Policy extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "context", nullable = false)
    private MasterDataContext context;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Policy parent;
}

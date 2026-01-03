package com.digiaudit.grcpc.domain.process;

import com.digiaudit.grcpc.domain.common.BaseEntity;
import com.digiaudit.grcpc.domain.common.MasterDataContext;
import com.digiaudit.grcpc.domain.org.Organization;
import jakarta.persistence.*;

@Entity
@Table(name = "subprocess", schema = "grcpc")
public class Subprocess extends BaseEntity {

    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "context", nullable = false)
    private MasterDataContext context;

    /** parent = central subprocess when clone happens */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Subprocess parent;

    /** only filled when context = LOCAL */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "process_id", nullable = false)
    private Process process;
}

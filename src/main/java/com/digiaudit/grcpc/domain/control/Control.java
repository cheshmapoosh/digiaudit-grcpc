package com.digiaudit.grcpc.domain.control;

import com.digiaudit.grcpc.domain.common.BaseEntity;
import com.digiaudit.grcpc.domain.common.MasterDataContext;
import com.digiaudit.grcpc.domain.process.Subprocess;
import jakarta.persistence.*;

@Entity
@Table(name = "control", schema = "grcpc")
public class Control extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "context", nullable = false)
    private MasterDataContext context;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "control_objective_id", nullable = false)
    private ControlObjective controlObjective;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subprocess_id", nullable = false)
    private Subprocess subprocess;
}

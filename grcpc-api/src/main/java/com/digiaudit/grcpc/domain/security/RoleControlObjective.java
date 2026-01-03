package com.digiaudit.grcpc.domain.security;

import com.digiaudit.grcpc.domain.common.BaseEntity;
import com.digiaudit.grcpc.domain.control.ControlObjective;
import jakarta.persistence.*;

@Entity
@Table(name = "role_control_objective", schema = "grcpc")
public class RoleControlObjective extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "control_objective_id", nullable = false)
    private ControlObjective controlObjective;

    @Enumerated(EnumType.STRING)
    @Column(name = "responsibility", nullable = false)
    private ResponsibilityType responsibility;
}

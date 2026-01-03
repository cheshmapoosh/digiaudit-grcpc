package com.digiaudit.grcpc.domain.control;

import com.digiaudit.grcpc.domain.common.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "control_objective", schema = "grcpc")
public class ControlObjective extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "objective_category")
    private String objectiveCategory;

    /** seen in UI: Timeframe Year */
    @Column(name = "timeframe_year")
    private Integer timeframeYear;
}

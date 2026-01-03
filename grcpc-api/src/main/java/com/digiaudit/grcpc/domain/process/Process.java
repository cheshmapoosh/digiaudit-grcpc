package com.digiaudit.grcpc.domain.process;

import com.digiaudit.grcpc.domain.common.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "process", schema = "grcpc")
public class Process extends BaseEntity {

    @Column(name = "code", nullable = false, unique = true)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;
}

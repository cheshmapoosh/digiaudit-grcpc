package com.digiaudit.grcpc.domain.policy;

import com.digiaudit.grcpc.domain.common.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "regulation", schema = "grcpc")
public class Regulation extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;
}

package com.digiaudit.grcpc.domain.security;

import com.digiaudit.grcpc.domain.common.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "role", schema = "grcpc")
public class Role extends BaseEntity {

    @Column(name = "name", nullable = false, unique = true)
    private String name;
}

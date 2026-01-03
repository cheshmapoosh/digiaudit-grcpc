package com.digiaudit.grcpc.domain.org;

import com.digiaudit.grcpc.domain.common.BaseEntity;
import jakarta.persistence.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "organization", schema = "grcpc")
public class Organization extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Organization parent;

    @OneToMany(mappedBy = "parent")
    private Set<Organization> children = new HashSet<>();
}

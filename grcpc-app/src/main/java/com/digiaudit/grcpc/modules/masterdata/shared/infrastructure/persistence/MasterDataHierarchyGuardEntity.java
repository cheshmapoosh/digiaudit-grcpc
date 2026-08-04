package com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "masterdata_hierarchy_guard")
public class MasterDataHierarchyGuardEntity {
    @Id
    @Column(name = "hierarchy_key", nullable = false, length = 64)
    private String hierarchyKey;

    protected MasterDataHierarchyGuardEntity() {
    }
}

package com.digiaudit.grcpc.modules.masterdata.shared.application;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;

public interface MasterDataHierarchyGuard {
    void lock(MasterDataHierarchyKey hierarchyKey);
}

package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;

import java.util.Collection;

public interface MasterDataRevisionCoordinator {
    RevisionExecutionResult execute(RevisionRequest request, RevisionOperation operation);

    RevisionExecutionResult executeStructural(
            MasterDataHierarchyKey hierarchyKey,
            RevisionRequest request,
            RevisionOperation operation
    );

    RevisionExecutionResult executeStructural(
            Collection<MasterDataHierarchyKey> hierarchyKeys,
            RevisionRequest request,
            RevisionOperation operation
    );
}

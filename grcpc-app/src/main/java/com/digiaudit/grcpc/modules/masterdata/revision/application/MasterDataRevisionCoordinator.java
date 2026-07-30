package com.digiaudit.grcpc.modules.masterdata.revision.application;

public interface MasterDataRevisionCoordinator {
    RevisionExecutionResult execute(RevisionRequest request, RevisionOperation operation);
}

package com.digiaudit.grcpc.modules.masterdata.revision.application;

@FunctionalInterface
public interface RevisionOperation {
    RevisionOperationResult execute(RevisionExecutionContext context);
}

package com.digiaudit.grcpc.modules.masterdata.revision.application;

@FunctionalInterface
public interface RevisionOperation {
    RevisionExecutionResult execute(RevisionExecutionContext context);
}

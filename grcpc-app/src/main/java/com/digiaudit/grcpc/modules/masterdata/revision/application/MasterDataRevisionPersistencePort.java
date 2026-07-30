package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.MasterDataRevision;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.MasterDataRevisionContent;

import java.util.List;

public interface MasterDataRevisionPersistencePort {
    long nextRevisionNumber();

    void saveAppliedRevision(
            MasterDataRevision revision,
            List<MasterDataRevisionContent> orderedContents,
            RevisionAuditMetadata auditMetadata
    );

    void flush();
}

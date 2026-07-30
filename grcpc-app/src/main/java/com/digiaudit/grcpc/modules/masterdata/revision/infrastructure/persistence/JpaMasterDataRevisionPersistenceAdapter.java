package com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence;

import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionPersistencePort;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionAuditMetadata;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.MasterDataRevision;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.MasterDataRevisionContent;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@Repository
public class JpaMasterDataRevisionPersistenceAdapter implements MasterDataRevisionPersistencePort {
    private final InternalMasterDataRevisionJpaRepository revisionRepository;
    private final InternalMasterDataRevisionContentJpaRepository contentRepository;
    private final MasterDataRevisionMapper mapper;

    public JpaMasterDataRevisionPersistenceAdapter(
            InternalMasterDataRevisionJpaRepository revisionRepository,
            InternalMasterDataRevisionContentJpaRepository contentRepository,
            MasterDataRevisionMapper mapper
    ) {
        this.revisionRepository = Objects.requireNonNull(revisionRepository, "revisionRepository is required");
        this.contentRepository = Objects.requireNonNull(contentRepository, "contentRepository is required");
        this.mapper = Objects.requireNonNull(mapper, "mapper is required");
    }

    @Override
    public long nextRevisionNumber() {
        BigDecimal sequenceValue = revisionRepository.nextRevisionNumber();
        if (sequenceValue == null) {
            throw new MasterDataRevisionPersistenceException("Oracle revision sequence did not return a value");
        }
        try {
            return sequenceValue.longValueExact();
        } catch (ArithmeticException ex) {
            throw new MasterDataRevisionPersistenceException("Oracle revision sequence value exceeds supported range", ex);
        }
    }

    @Override
    public void saveAppliedRevision(
            MasterDataRevision revision,
            List<MasterDataRevisionContent> orderedContents,
            RevisionAuditMetadata auditMetadata
    ) {
        revisionRepository.save(mapper.toHeaderEntity(revision, auditMetadata));
        contentRepository.saveAll(mapper.toContentEntities(revision, orderedContents, auditMetadata));
    }

    @Override
    public void flush() {
        revisionRepository.flush();
        contentRepository.flush();
    }
}

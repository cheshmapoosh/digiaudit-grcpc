package com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InternalMasterDataRevisionContentJpaRepository extends JpaRepository<MasterDataRevisionContentEntity, UUID> {
}

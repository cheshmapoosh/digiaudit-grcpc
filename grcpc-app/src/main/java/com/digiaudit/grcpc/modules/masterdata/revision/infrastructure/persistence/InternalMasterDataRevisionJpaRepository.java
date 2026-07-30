package com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.UUID;

public interface InternalMasterDataRevisionJpaRepository extends JpaRepository<MasterDataRevisionEntity, UUID> {
    @Query(value = "select seq_masterdata_revision_number.nextval from dual", nativeQuery = true)
    BigDecimal nextRevisionNumber();
}

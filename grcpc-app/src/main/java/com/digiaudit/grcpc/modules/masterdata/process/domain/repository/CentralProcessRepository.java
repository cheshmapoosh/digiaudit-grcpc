package com.digiaudit.grcpc.modules.masterdata.process.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralProcessEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CentralProcessRepository extends JpaRepository<CentralProcessEntity, UUID> {
    List<CentralProcessEntity> findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);

    Optional<CentralProcessEntity> findByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);

    boolean existsByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);

    boolean existsByParentProcessIdAndStatusNot(UUID parentProcessId, MasterDataLifecycleStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select process from CentralProcessEntity process where process.id = :id")
    Optional<CentralProcessEntity> lockById(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select process from CentralProcessEntity process where upper(process.code) = upper(:code)")
    Optional<CentralProcessEntity> lockByNormalizedCode(@Param("code") String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select process from CentralProcessEntity process where process.status <> :deletedStatus")
    List<CentralProcessEntity> lockAllNonDeleted(@Param("deletedStatus") MasterDataLifecycleStatus deletedStatus);
}

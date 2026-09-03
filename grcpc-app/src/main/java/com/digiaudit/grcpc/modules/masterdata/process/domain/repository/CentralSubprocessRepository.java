package com.digiaudit.grcpc.modules.masterdata.process.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CentralSubprocessRepository extends JpaRepository<CentralSubprocessEntity, UUID> {
    List<CentralSubprocessEntity> findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);

    List<CentralSubprocessEntity> findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);

    Optional<CentralSubprocessEntity> findByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);

    boolean existsByProcessIdAndStatusNot(UUID processId, MasterDataLifecycleStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select subprocess from CentralSubprocessEntity subprocess where subprocess.id = :id")
    Optional<CentralSubprocessEntity> lockById(@Param("id") UUID id);

    @Query("select subprocess from CentralSubprocessEntity subprocess where upper(subprocess.code) = upper(:code)")
    Optional<CentralSubprocessEntity> findByNormalizedCode(@Param("code") String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select subprocess from CentralSubprocessEntity subprocess where upper(subprocess.code) = upper(:code)")
    Optional<CentralSubprocessEntity> lockByNormalizedCode(@Param("code") String code);
}

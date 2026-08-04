package com.digiaudit.grcpc.modules.organization.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<OrganizationEntity, UUID> {
    List<OrganizationEntity> findByStatusNotOrderByCodeAscIdAsc(MasterDataLifecycleStatus status);

    List<OrganizationEntity> findByStatusOrderByCodeAscIdAsc(MasterDataLifecycleStatus status);

    Optional<OrganizationEntity> findByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);

    boolean existsByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);

    boolean existsByParentOrganizationIdAndStatusNot(UUID parentOrganizationId, MasterDataLifecycleStatus status);

    List<OrganizationEntity> findAllByOrderByIdAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select organization from OrganizationEntity organization where organization.id = :id")
    Optional<OrganizationEntity> lockById(@Param("id") UUID id);

}

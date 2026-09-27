package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalSubprocessRiskScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LocalSubprocessRiskScopeRepository extends JpaRepository<LocalSubprocessRiskScopeEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalSubprocessRiskScopeEntity e where e.id = :id")
  Optional<LocalSubprocessRiskScopeEntity> lockById(@Param("id") UUID id);
  Optional<LocalSubprocessRiskScopeEntity> findByOrganizationSubprocessScopeIdAndRiskTemplateId(UUID organizationSubprocessScopeId, UUID riskTemplateId);
  Page<LocalSubprocessRiskScopeEntity> findByOrganizationSubprocessScopeIdAndStatusIn(UUID organizationSubprocessScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByOrganizationSubprocessScopeIdAndStatusNot(UUID organizationSubprocessScopeId, MasterDataLifecycleStatus status);
  boolean existsByRiskTemplateIdAndStatusNot(UUID riskTemplateId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRiskScopeEntity> findByRiskTemplateIdAndStatusIn(UUID riskTemplateId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByCentralRiskScopeIdAndStatusNot(UUID centralRiskScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRiskScopeEntity> findByCentralRiskScopeIdAndStatusIn(UUID centralRiskScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}


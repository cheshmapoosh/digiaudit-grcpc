package com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.entity.CentralSubprocessRiskScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralSubprocessRiskScopeRepository
    extends JpaRepository<CentralSubprocessRiskScopeEntity, UUID> {

  interface EndpointIds {
    UUID getSubprocessId();
    UUID getRiskTemplateId();
  }

  List<CentralSubprocessRiskScopeEntity> findBySubprocessIdAndStatusNot(
      UUID subprocessId, MasterDataLifecycleStatus status);

  List<CentralSubprocessRiskScopeEntity> findBySubprocessIdAndStatus(
      UUID subprocessId, MasterDataLifecycleStatus status);

  List<CentralSubprocessRiskScopeEntity> findByRiskTemplateIdAndStatusNot(
      UUID riskTemplateId, MasterDataLifecycleStatus status);

  List<CentralSubprocessRiskScopeEntity> findByRiskTemplateIdAndStatus(
      UUID riskTemplateId, MasterDataLifecycleStatus status);

  @Query(
      "select s.subprocessId as subprocessId, s.riskTemplateId as riskTemplateId "
          + "from CentralSubprocessRiskScopeEntity s where s.id = :id")
  Optional<EndpointIds> findEndpointIdsById(@Param("id") UUID id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select s from CentralSubprocessRiskScopeEntity s "
          + "where s.subprocessId = :subprocessId and s.riskTemplateId = :riskTemplateId")
  Optional<CentralSubprocessRiskScopeEntity> lockByBusinessKey(
      @Param("subprocessId") UUID subprocessId,
      @Param("riskTemplateId") UUID riskTemplateId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select s from CentralSubprocessRiskScopeEntity s "
          + "where s.subprocessId = :subprocessId and s.riskTemplateId in :riskTemplateIds "
          + "order by s.riskTemplateId, s.id")
  List<CentralSubprocessRiskScopeEntity> lockByBusinessKeys(
      @Param("subprocessId") UUID subprocessId,
      @Param("riskTemplateIds") List<UUID> riskTemplateIds);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralSubprocessRiskScopeEntity s where s.id = :id")
  Optional<CentralSubprocessRiskScopeEntity> lockById(@Param("id") UUID id);
}

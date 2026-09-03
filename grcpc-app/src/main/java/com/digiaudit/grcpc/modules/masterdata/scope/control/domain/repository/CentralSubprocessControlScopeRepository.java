package com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralSubprocessControlScopeRepository
    extends JpaRepository<CentralSubprocessControlScopeEntity, UUID> {

  interface EndpointIds {
    UUID getSubprocessId();
    UUID getControlId();
  }

  List<CentralSubprocessControlScopeEntity> findBySubprocessIdAndStatusNot(
      UUID subprocessId, MasterDataLifecycleStatus status);

  List<CentralSubprocessControlScopeEntity> findBySubprocessIdAndStatus(
      UUID subprocessId, MasterDataLifecycleStatus status);

  List<CentralSubprocessControlScopeEntity> findByControlIdAndStatusNot(
      UUID controlId, MasterDataLifecycleStatus status);

  List<CentralSubprocessControlScopeEntity> findByControlIdAndStatus(
      UUID controlId, MasterDataLifecycleStatus status);

  @Query(
      "select s.subprocessId as subprocessId, s.controlId as controlId "
          + "from CentralSubprocessControlScopeEntity s where s.id = :id")
  Optional<EndpointIds> findEndpointIdsById(@Param("id") UUID id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select s from CentralSubprocessControlScopeEntity s "
          + "where s.subprocessId = :subprocessId and s.controlId = :controlId")
  Optional<CentralSubprocessControlScopeEntity> lockByBusinessKey(
      @Param("subprocessId") UUID subprocessId, @Param("controlId") UUID controlId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select s from CentralSubprocessControlScopeEntity s "
          + "where s.subprocessId = :subprocessId and s.controlId in :controlIds "
          + "order by s.controlId, s.id")
  List<CentralSubprocessControlScopeEntity> lockByBusinessKeys(
      @Param("subprocessId") UUID subprocessId, @Param("controlIds") List<UUID> controlIds);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralSubprocessControlScopeEntity s where s.id = :id")
  Optional<CentralSubprocessControlScopeEntity> lockById(@Param("id") UUID id);
}

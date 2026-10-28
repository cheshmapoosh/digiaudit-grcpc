package com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GlobalControlRepository extends JpaRepository<GlobalControlEntity, UUID> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query("select e from GlobalControlEntity e where e.id = :id")
  Optional<GlobalControlEntity> lockById(@org.springframework.data.repository.query.Param("id") UUID id);
  List<GlobalControlEntity> findAllByOrderByTitleAscIdAsc();
  Optional<GlobalControlEntity> findByCode(String code);
  boolean existsByControlGroupIdAndStatusNot(UUID controlGroupId, MasterDataLifecycleStatus status);
}

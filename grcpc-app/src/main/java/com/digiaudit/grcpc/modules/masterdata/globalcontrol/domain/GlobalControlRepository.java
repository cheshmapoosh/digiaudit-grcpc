package com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GlobalControlRepository extends JpaRepository<GlobalControlEntity, UUID> {
  List<GlobalControlEntity> findAllByOrderByTitleAscIdAsc();
  Optional<GlobalControlEntity> findByCode(String code);
  boolean existsByControlGroupIdAndStatusNot(UUID controlGroupId, MasterDataLifecycleStatus status);
}

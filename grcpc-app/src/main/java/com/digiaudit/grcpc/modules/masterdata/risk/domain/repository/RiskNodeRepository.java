package com.digiaudit.grcpc.modules.masterdata.risk.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.risk.domain.entity.RiskNodeEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RiskNodeRepository extends JpaRepository<RiskNodeEntity, UUID> {
    List<RiskNodeEntity> findAllByOrderBySortOrderAscTitleAsc();
    List<RiskNodeEntity> findByParentIdOrderBySortOrderAscTitleAsc(UUID parentId);
    List<RiskNodeEntity> findByParentIdIsNullOrderBySortOrderAscTitleAsc();
    boolean existsByParentId(UUID parentId);
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);
    Optional<RiskNodeEntity> findByCodeIgnoreCase(String code);
}

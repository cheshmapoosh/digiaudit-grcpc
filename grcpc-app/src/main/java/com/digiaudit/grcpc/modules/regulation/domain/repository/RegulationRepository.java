package com.digiaudit.grcpc.modules.regulation.domain.repository;

import com.digiaudit.grcpc.modules.regulation.domain.entity.RegulationEntity;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RegulationRepository extends JpaRepository<RegulationEntity, UUID> {

    List<RegulationEntity> findAllByOrderBySortOrderAscTitleAsc();

    List<RegulationEntity> findByParentIdOrderBySortOrderAscTitleAsc(UUID parentId);

    List<RegulationEntity> findByParentIdIsNullOrderBySortOrderAscTitleAsc();

    List<RegulationEntity> findByNodeTypeOrderBySortOrderAscTitleAsc(RegulationNodeType nodeType);

    boolean existsByParentId(UUID parentId);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);
}

package com.digiaudit.grcpc.modules.regulation.domain.repository;

import com.digiaudit.grcpc.modules.regulation.domain.entity.RegulationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RegulationRepository extends JpaRepository<RegulationEntity, UUID> {

    List<RegulationEntity> findAllByOrderByTitleAsc();

    List<RegulationEntity> findByParentIdOrderByTitleAsc(UUID parentId);

    List<RegulationEntity> findByParentIdIsNullOrderByTitleAsc();

    boolean existsByParentId(UUID parentId);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);
}

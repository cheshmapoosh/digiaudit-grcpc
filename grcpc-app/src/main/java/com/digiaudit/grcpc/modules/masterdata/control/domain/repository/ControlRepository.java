package com.digiaudit.grcpc.modules.masterdata.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ControlRepository extends JpaRepository<ControlEntity, UUID> {

    List<ControlEntity> findAllByOrderByCodeAscNameAsc();

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    Optional<ControlEntity> findByCodeIgnoreCase(String code);
}

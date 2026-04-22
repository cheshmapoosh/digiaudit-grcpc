package com.digiaudit.grcpc.modules.setup.domain.repository;

import com.digiaudit.grcpc.modules.setup.domain.entity.SystemSetupEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SystemSetupRepository extends JpaRepository<SystemSetupEntity, UUID> {
}

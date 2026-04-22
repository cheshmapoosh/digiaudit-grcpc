package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.PermissionI18nEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PermissionI18nRepository extends JpaRepository<PermissionI18nEntity, UUID> {
}

package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.BusinessPermissionI18nEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BusinessPermissionI18nRepository extends JpaRepository<BusinessPermissionI18nEntity, UUID> {
}

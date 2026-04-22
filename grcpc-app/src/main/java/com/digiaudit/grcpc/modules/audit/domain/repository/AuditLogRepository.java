package com.digiaudit.grcpc.modules.audit.domain.repository;

import com.digiaudit.grcpc.modules.audit.domain.entity.AuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, UUID> {
}

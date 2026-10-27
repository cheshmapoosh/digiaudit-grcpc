package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralRiskControlAssignmentResponse(
    UUID assignmentId,
    UUID controlId, String controlCode, String controlTitle,
    MasterDataLifecycleStatus controlStatus, LocalDate controlValidFrom, LocalDate controlValidTo,
    UUID riskTemplateId, String riskTemplateCode, String riskTemplateTitle,
    MasterDataLifecycleStatus riskTemplateStatus, LocalDate riskTemplateValidFrom, LocalDate riskTemplateValidTo,
    MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version,
    Instant createdAt, UUID createdBy, Instant updatedAt, UUID updatedBy,
    Instant deletedAt, UUID deletedBy) {}

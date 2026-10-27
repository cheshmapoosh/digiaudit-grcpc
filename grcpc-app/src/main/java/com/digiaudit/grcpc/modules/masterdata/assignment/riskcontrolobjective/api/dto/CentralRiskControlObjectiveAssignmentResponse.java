package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralRiskControlObjectiveAssignmentResponse(
    UUID assignmentId,
    UUID controlObjectiveId, String controlObjectiveCode, String controlObjectiveTitle,
    MasterDataLifecycleStatus controlObjectiveStatus, LocalDate controlObjectiveValidFrom, LocalDate controlObjectiveValidTo,
    UUID riskTemplateId, String riskTemplateCode, String riskTemplateTitle,
    MasterDataLifecycleStatus riskTemplateStatus, LocalDate riskTemplateValidFrom, LocalDate riskTemplateValidTo,
    MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version,
    Instant createdAt, UUID createdBy, Instant updatedAt, UUID updatedBy,
    Instant deletedAt, UUID deletedBy) {}

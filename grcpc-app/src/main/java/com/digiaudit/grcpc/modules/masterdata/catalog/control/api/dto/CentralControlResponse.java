package com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

public record CentralControlResponse(
    UUID id,
    String code,
    String title,
    String description,
    UUID controlGroupId,
    CentralControlClass controlClass,
    CentralControlImportance importance,
    CentralControlRisk controlRisk,
    CentralControlAutomationType automationType,
    CentralControlPurpose controlPurpose,
    CentralControlNature nature,
    Set<CentralControlRelevance> controlRelevance,
    CentralControlTriggerType triggerType,
    String eventDescription,
    CentralControlOperationFrequency operationFrequency,
    Boolean toBeTested,
    CentralControlTestAutomationType testAutomationType,
    CentralControlTestingTechnique testingTechnique,
    CentralControlEvidenceLevel evidenceLevel,
    MasterDataLifecycleStatus status,
    LocalDate validFrom,
    LocalDate validTo,
    long version,
    Instant createdAt,
    UUID createdBy,
    Instant updatedAt,
    UUID updatedBy,
    Instant deletedAt,
    UUID deletedBy) {}

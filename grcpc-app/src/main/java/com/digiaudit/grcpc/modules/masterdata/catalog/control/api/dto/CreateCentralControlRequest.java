package com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

public record CreateCentralControlRequest(
    @NotBlank String code,
    @NotBlank String title,
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
    @Size(max = 1000) String eventDescription,
    CentralControlOperationFrequency operationFrequency,
    Boolean toBeTested,
    CentralControlTestAutomationType testAutomationType,
    CentralControlTestingTechnique testingTechnique,
    CentralControlEvidenceLevel evidenceLevel,
    LocalDate validFrom,
    LocalDate validTo,
    @Valid DocumentAggregateBatchRequest documents) {}

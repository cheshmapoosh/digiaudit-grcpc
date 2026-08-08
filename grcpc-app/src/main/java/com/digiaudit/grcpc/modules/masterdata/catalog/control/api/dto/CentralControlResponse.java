package com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlAutomationType;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlClass;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlImportance;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlPurpose;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralControlResponse(
    UUID id,
    String code,
    String title,
    String description,
    CentralControlClass controlClass,
    CentralControlImportance importance,
    CentralControlAutomationType automationType,
    CentralControlPurpose controlPurpose,
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

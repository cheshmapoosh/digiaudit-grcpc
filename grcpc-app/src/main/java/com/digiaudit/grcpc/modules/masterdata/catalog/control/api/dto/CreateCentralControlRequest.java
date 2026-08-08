package com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlAutomationType;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlClass;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlImportance;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlPurpose;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record CreateCentralControlRequest(
    @NotBlank String code,
    @NotBlank String title,
    String description,
    CentralControlClass controlClass,
    CentralControlImportance importance,
    CentralControlAutomationType automationType,
    CentralControlPurpose controlPurpose,
    LocalDate validFrom,
    LocalDate validTo,
    @Valid DocumentAggregateBatchRequest documents) {}

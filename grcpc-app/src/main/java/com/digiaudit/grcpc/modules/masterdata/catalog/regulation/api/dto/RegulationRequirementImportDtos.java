package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class RegulationRequirementImportDtos {
  private RegulationRequirementImportDtos() {}

  public record Issue(int rowNumber, String field, String code) {}

  public record Row(
      int rowNumber,
      String code,
      String title,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      RevisionOperationType operation) {}

  public record Preview(
      UUID regulationId,
      String regulationTitle,
      String fingerprint,
      boolean valid,
      List<Row> rows,
      List<Issue> issues) {}

  public record Result(UUID entityId, UUID revisionId, long version, UUID regulationId, int importedCount) {}

  public record ValidationError(Instant timestamp, int status, String error, String code,
      String message, List<String> details, Preview preview) {}
}

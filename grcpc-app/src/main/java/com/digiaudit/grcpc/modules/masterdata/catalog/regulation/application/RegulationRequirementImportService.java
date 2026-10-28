package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;

import com.digiaudit.grcpc.common.exception.BusinessException;
import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.RegulationRequirementImportDtos.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class RegulationRequirementImportService {
  private final RegulationRequirementWorkbookReader reader;
  private final CentralRegulationRepository regulations;
  private final CentralRegulationRequirementRepository requirements;
  private final CatalogCommandSupport support;
  private final MasterDataRevisionCoordinator revisions;
  private final RevisionMutationGuard guard;
  private final MasterDataRevisionActorProvider actors;
  private final Clock clock;

  public RegulationRequirementImportService(
      RegulationRequirementWorkbookReader reader,
      CentralRegulationRepository regulations,
      CentralRegulationRequirementRepository requirements,
      CatalogCommandSupport support,
      MasterDataRevisionCoordinator revisions,
      RevisionMutationGuard guard,
      MasterDataRevisionActorProvider actors,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.reader = reader;
    this.regulations = regulations;
    this.requirements = requirements;
    this.support = support;
    this.revisions = revisions;
    this.guard = guard;
    this.actors = actors;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public Preview preview(UUID regulationId, MultipartFile file) {
    var parsed = reader.read(file);
    var regulation = requireRegulation(regulations.findById(regulationId).orElse(null), regulationId);
    var normalized = normalize(regulationId, parsed);
    var codes = lookupCodes(normalized);
    var existing = codes.isEmpty() ? List.<CentralRegulationRequirementEntity>of()
        : requirements.findByCodeIn(codes);
    return validate(regulation, parsed, normalized, existing);
  }

  public Result commit(UUID regulationId, MultipartFile file, String expectedFingerprint) {
    // File parsing has no database reads and stays outside the short Guard transaction.
    var parsed = reader.read(file);
    var normalized = normalize(regulationId, parsed);
    try {
      var result = revisions.executeStructural(
          List.of(MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.REGULATION),
          RevisionRequest.central("Import regulation requirements", "Excel requirement import", null),
          context -> {
            guard.requireHierarchyGuard(context, MasterDataHierarchyKey.CONTROL);
            guard.requireHierarchyGuard(context, MasterDataHierarchyKey.REGULATION);
            var regulation = requireRegulation(regulations.lockById(regulationId).orElse(null), regulationId);
            var codes = lookupCodes(normalized);
            var existing = codes.isEmpty() ? List.<CentralRegulationRequirementEntity>of()
                : requirements.lockAllByCodes(codes);
            var preview = validate(regulation, parsed, normalized, existing);
            if (!preview.valid()) throw new InvalidImportException(preview);
            if (expectedFingerprint == null || !expectedFingerprint.equals(preview.fingerprint())) throw stale();

            Map<String, CentralRegulationRequirementEntity> byCode = byCode(existing);
            List<PendingMutation> pending = new ArrayList<>();
            UUID actor = actors.currentActorId();
            Instant now = Instant.now(clock);
            for (Row row : preview.rows()) {
              var entity = byCode.get(row.code());
              Long version = entity == null ? null : entity.getVersion();
              var before = entity == null ? null : support.snapshot(entity, typed(entity));
              if (entity == null) {
                entity = CentralRegulationRequirementEntity.create(UUID.randomUUID(), row.code(), row.title(),
                    regulationId, row.description(), row.sortOrder(), row.validFrom(), row.validTo(), actor, now);
              } else if (row.operation() == RevisionOperationType.RESTORE) {
                entity.restoreFromCreate(row.title(), regulationId, row.description(), row.sortOrder(),
                    row.validFrom(), row.validTo(), actor, now);
              } else {
                entity.reactivateFromCreate(row.title(), regulationId, row.description(), row.sortOrder(),
                    row.validFrom(), row.validTo(), actor, now);
              }
              pending.add(new PendingMutation(requirements.save(entity), row.operation(), version, before));
            }
            requirements.flush();
            List<RevisionContentResult> contents = new ArrayList<>();
            MasterDataMutationResult primary = null;
            for (var mutation : pending) {
              var completed = support.completed(context, mutation.entity(), RevisionEntityType.CENTRAL_REGULATION_REQUIREMENT,
                  mutation.operation(), mutation.expectedVersion(), mutation.before(), typed(mutation.entity()));
              if (primary == null) primary = completed.primaryResult();
              contents.addAll(completed.contentResults());
            }
            return RevisionOperationResult.completed(context, primary, contents);
          });
      var primary = result.primaryResult();
      return new Result(primary.entityId(), primary.revisionId(), primary.version(), regulationId, normalized.rows().size());
    } catch (DataIntegrityViolationException e) {
      if (support.containsConstraint(e, "UK_CENTRAL_REG_REQUIREMENT_CODE")) throw stale();
      throw e;
    }
  }

  private Normalized normalize(UUID regulationId, RegulationRequirementWorkbookReader.Parsed parsed) {
    List<Issue> issues = new ArrayList<>(parsed.issues());
    List<Row> rows = new ArrayList<>();
    Map<String, Integer> codes = new HashMap<>();
    for (var raw : parsed.rows()) {
      var cells = raw.cells();
      int number = raw.rowNumber();
      String title = cells.get(0);
      try {
        title = support.normalizeTitle(title);
      } catch (BusinessException e) {
        issues.add(new Issue(number, "title", title.isBlank() ? "TITLE_REQUIRED" : "TITLE_LENGTH"));
      }
      String description = support.normalizeDescription(cells.get(1));
      if (description != null && description.length() > 32767) issues.add(new Issue(number, "description", "DESCRIPTION_LENGTH"));
      int sortOrder = number - 1;
      if (!cells.get(3).isBlank()) {
        try {
          String sort = RequirementImportDates.englishDigits(cells.get(3));
          if (!sort.matches("[0-9]+")) throw new NumberFormatException();
          sortOrder = support.normalizeSortOrder(Integer.valueOf(sort));
        } catch (NumberFormatException | BusinessException e) {
          issues.add(new Issue(number, "sortOrder", "SORT_ORDER"));
        }
      }
      LocalDate from = date(cells.get(4), number, "validFrom", issues);
      LocalDate to = date(cells.get(5), number, "validTo", issues);
      if (from != null && to != null && to.isBefore(from)) issues.add(new Issue(number, "validTo", "DATE_RANGE"));
      // Stable across re-saving/reformatting Excel and moving a row to another file.
      String contentKey = String.join("\u0000", regulationId.toString(), title.trim(),
          description == null ? "" : description, from == null ? "" : from.toString(), to == null ? "" : to.toString());
      String code = cells.get(2).isBlank() ? "REQ-" + RegulationRequirementWorkbookReader.digest(
          contentKey.getBytes(StandardCharsets.UTF_8)).substring(0, 32) : cells.get(2);
      try {
        code = support.normalizeCode(code);
      } catch (BusinessException e) {
        issues.add(new Issue(number, "code", "CODE_LENGTH"));
      }
      Integer previous = codes.putIfAbsent(code, number);
      if (previous != null) issues.add(new Issue(number, "code", "DUPLICATE_FILE_CODE"));
      rows.add(new Row(number, code, title, description, sortOrder, from, to, RevisionOperationType.CREATE));
    }
    return new Normalized(List.copyOf(rows), List.copyOf(issues));
  }

  private List<String> lookupCodes(Normalized normalized) {
    return normalized.rows().stream().map(Row::code)
        .filter(code -> !code.isBlank() && code.getBytes(StandardCharsets.UTF_8).length <= 64)
        .distinct().toList();
  }

  private LocalDate date(String value, int row, String field, List<Issue> issues) {
    try {
      return RequirementImportDates.parse(value);
    } catch (DateTimeException e) {
      issues.add(new Issue(row, field, "DATE"));
      return null;
    }
  }

  private Preview validate(CentralRegulationEntity regulation, RegulationRequirementWorkbookReader.Parsed parsed,
      Normalized normalized, List<CentralRegulationRequirementEntity> existing) {
    List<Issue> issues = new ArrayList<>(normalized.issues());
    Map<String, CentralRegulationRequirementEntity> byCode = byCode(existing);
    List<Row> rows = new ArrayList<>();
    for (Row row : normalized.rows()) {
      var stored = byCode.get(row.code());
      var operation = RevisionOperationType.CREATE;
      if (stored != null) {
        if (!stored.getRegulationId().equals(regulation.getId())) {
          issues.add(new Issue(row.rowNumber(), "code", "OTHER_REGULATION"));
        } else if (stored.getStatus() == MasterDataLifecycleStatus.ACTIVE) {
          issues.add(new Issue(row.rowNumber(), "code", "DUPLICATE_CODE"));
        } else {
          operation = stored.getStatus() == MasterDataLifecycleStatus.DELETED
              ? RevisionOperationType.RESTORE : RevisionOperationType.ACTIVATE;
        }
      }
      rows.add(new Row(row.rowNumber(), row.code(), row.title(), row.description(), row.sortOrder(),
          row.validFrom(), row.validTo(), operation));
    }
    StringBuilder state = new StringBuilder(parsed.digest()).append(':').append(regulation.getId())
        .append(':').append(regulation.getVersion());
    existing.stream().sorted(java.util.Comparator.comparing(CentralRegulationRequirementEntity::getCode)).forEach(e ->
        state.append('|').append(e.getId()).append(':').append(e.getVersion()).append(':').append(e.getStatus()));
    String fingerprint = RegulationRequirementWorkbookReader.digest(state.toString().getBytes(StandardCharsets.UTF_8));
    return new Preview(regulation.getId(), regulation.getTitle(), fingerprint, issues.isEmpty(),
        issues.isEmpty() ? List.copyOf(rows) : List.of(), List.copyOf(issues));
  }

  private Map<String, CentralRegulationRequirementEntity> byCode(List<CentralRegulationRequirementEntity> entities) {
    Map<String, CentralRegulationRequirementEntity> byCode = new HashMap<>();
    entities.forEach(e -> byCode.put(e.getCode(), e));
    return byCode;
  }

  private Map<String, ?> typed(CentralRegulationRequirementEntity entity) {
    return Map.of("regulationId", entity.getRegulationId(), "sortOrder", entity.getSortOrder());
  }

  private CentralRegulationEntity requireRegulation(CentralRegulationEntity entity, UUID id) {
    if (entity == null || entity.getStatus() == MasterDataLifecycleStatus.DELETED) {
      throw new NotFoundException("PARENT_NOT_FOUND", "error.masterdata.v2.parentNotFound", "Regulation not found", id);
    }
    return entity;
  }

  private ConflictException stale() {
    return new ConflictException("REQUIREMENT_IMPORT_PREVIEW_STALE", "error.masterdata.regulationImport.previewStale",
        "The import preview has changed; validate the file again");
  }

  public static final class InvalidImportException extends UnprocessableEntityException {
    private final Preview preview;

    public InvalidImportException(Preview preview) {
      super("REQUIREMENT_IMPORT_INVALID", "error.masterdata.regulationImport.invalid", "The import file is invalid");
      this.preview = preview;
    }

    public Preview preview() { return preview; }
  }

  private record Normalized(List<Row> rows, List<Issue> issues) {}
  private record PendingMutation(CentralRegulationRequirementEntity entity, RevisionOperationType operation,
      Long expectedVersion, JsonNode before) {}
}

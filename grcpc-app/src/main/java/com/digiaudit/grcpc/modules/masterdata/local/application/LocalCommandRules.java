package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataHierarchyGuard;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

/** Scalar Local command checks; each relationship keeps a concrete typed service. */
@Component
public class LocalCommandRules {
  private final MasterDataAuthorizationService authorization;
  private final MasterDataHierarchyGuard guard;

  public LocalCommandRules(MasterDataAuthorizationService authorization,
      MasterDataHierarchyGuard guard) {
    this.authorization = authorization;
    this.guard = guard;
  }

  public void requireView(String... additionalAreas) {
    if (!authorization.canView("REFERENCE")
        || Arrays.stream(additionalAreas).anyMatch(area -> !authorization.canView(area))) {
      throw new ForbiddenException("MASTER_DATA_ACCESS_DENIED", "error.security.forbidden",
          "Local read access denied");
    }
  }

  public <T> T family(String family, java.util.function.Supplier<T> validation) {
    try { return validation.get(); }
    catch (com.digiaudit.grcpc.common.exception.BusinessException failure) {
      failure.putErrorContext("relationFamily", family);
      throw failure;
    }
  }

  public void requireWrite(String... additionalAreas) {
    if (!authorization.canManage("REFERENCE")
        || Arrays.stream(additionalAreas).anyMatch(area -> !authorization.canView(area))) {
      throw new ForbiddenException("MASTER_DATA_ACCESS_DENIED", "error.security.forbidden",
          "Local write access denied");
    }
  }

  public void lock(MasterDataHierarchyKey... keys) {
    Arrays.stream(keys).distinct().sorted(Comparator.comparing(Enum::name)).forEach(guard::lock);
  }

  public PageRequest pageable(int page, int size, String sort, String direction) {
    if (page < 0 || size < 1 || size > 100
        || !List.of("id", "createdAt").contains(sort)
        || !List.of("ASC", "DESC").contains(direction)) {
      throw bad("Invalid Local pagination");
    }
    return PageRequest.of(page, size, Sort.by(Sort.Direction.valueOf(direction), sort)
        .and(Sort.by("id")));
  }

  public List<MasterDataLifecycleStatus> statuses(MasterDataLifecycleStatus filter) {
    return filter == null
        ? List.of(MasterDataLifecycleStatus.ACTIVE, MasterDataLifecycleStatus.INACTIVE)
        : List.of(filter);
  }

  public void assertVersion(long current, Long expected) {
    if (expected == null || expected < 0) throw bad("Nonnegative version is required");
    if (current != expected) throw new ConflictException("VERSION_CONFLICT",
        "error.masterdata.v2.versionConflict", "Local version conflict");
  }

  public void assertOwner(UUID expected, UUID actual) {
    if (expected != null && !expected.equals(actual)) throw notFound(expected);
  }

  public void dates(LocalDate from, LocalDate to) {
    if (from != null && to != null && from.isAfter(to)) {
      throw invalid("DATE_RANGE_INVALID", "validFrom exceeds validTo");
    }
  }

  public boolean contained(LocalDate childFrom, LocalDate childTo,
      LocalDate parentFrom, LocalDate parentTo) {
    return (parentFrom == null || (childFrom != null && !childFrom.isBefore(parentFrom)))
        && (parentTo == null || (childTo != null && !childTo.isAfter(parentTo)));
  }

  public void active(MasterDataLifecycleStatus status) {
    if (status != MasterDataLifecycleStatus.ACTIVE) {
      throw invalid("LOCAL_REFERENCE_NOT_ELIGIBLE", "Local reference must be ACTIVE");
    }
  }

  public void nonDeleted(MasterDataLifecycleStatus status) {
    if (status == MasterDataLifecycleStatus.DELETED) {
      throw invalid("LOCAL_REFERENCE_NOT_ELIGIBLE", "Local reference is DELETED");
    }
  }

  public void transition(MasterDataLifecycleStatus status, String action) {
    boolean valid = switch (action) {
      case "activate" -> status == MasterDataLifecycleStatus.INACTIVE;
      case "inactivate" -> status == MasterDataLifecycleStatus.ACTIVE;
      case "delete" -> status != MasterDataLifecycleStatus.DELETED;
      case "restore" -> status == MasterDataLifecycleStatus.DELETED;
      default -> false;
    };
    if (!valid) throw invalid("INVALID_LIFECYCLE_TRANSITION", "Invalid Local transition");
  }

  /** Scalar validation shared by the concrete typed Organization draft adapters. */
  public MasterDataLifecycleStatus aggregateTarget(MasterDataLifecycleStatus current,
      com.digiaudit.grcpc.modules.masterdata.local.api.dto.OrganizationLocalDtos.Operation operation,
      MasterDataLifecycleStatus requested, UUID currentId, Long currentVersion, UUID id, Long version) {
    if (operation == null) throw bad("Local operation is required");
    if (operation != com.digiaudit.grcpc.modules.masterdata.local.api.dto.OrganizationLocalDtos.Operation.UPDATE && requested != null)
      throw bad("Only UPDATE may request a Local lifecycle status");
    if (current == null) {
      if (operation != com.digiaudit.grcpc.modules.masterdata.local.api.dto.OrganizationLocalDtos.Operation.CREATE_OR_RESTORE
          || id != null || version != null) throw bad("New Local identity is invalid");
      return MasterDataLifecycleStatus.ACTIVE;
    }
    if (id == null || !currentId.equals(id)) throw bad("Local identity changed");
    assertVersion(currentVersion, version);
    if (operation == com.digiaudit.grcpc.modules.masterdata.local.api.dto.OrganizationLocalDtos.Operation.CREATE_OR_RESTORE
        || operation == com.digiaudit.grcpc.modules.masterdata.local.api.dto.OrganizationLocalDtos.Operation.RESTORE) {
      if (current != MasterDataLifecycleStatus.DELETED) throw duplicate(current);
      return MasterDataLifecycleStatus.ACTIVE;
    }
    nonDeleted(current);
    return switch (operation) {
      case ACTIVATE -> MasterDataLifecycleStatus.ACTIVE;
      case INACTIVATE -> MasterDataLifecycleStatus.INACTIVE;
      case DELETE -> MasterDataLifecycleStatus.DELETED;
      case UPDATE -> {
        if (requested == MasterDataLifecycleStatus.DELETED) throw bad("UPDATE cannot delete a Local row");
        yield requested == null ? current : requested;
      }
      default -> throw bad("Invalid Local operation");
    };
  }

  public String note(String value) {
    if (value == null || value.isBlank()) return null;
    String result = value.trim();
    if (result.length() > 1000) throw bad("Local note exceeds 1000 characters");
    return result;
  }

  public ConflictException duplicate(MasterDataLifecycleStatus status) {
    boolean deleted = status == MasterDataLifecycleStatus.DELETED;
    return new ConflictException(deleted ? "LOCAL_RESTORE_REQUIRED" : "DUPLICATE_RELATION",
        "error.masterdata.local." + (deleted ? "LOCAL_RESTORE_REQUIRED" : "DUPLICATE_RELATION"),
        "Local business key is reserved");
  }

  public NotFoundException notFound(UUID id) {
    return new NotFoundException("LOCAL_RESOURCE_NOT_FOUND", "error.masterdata.local.LOCAL_RESOURCE_NOT_FOUND",
        "Local row not found", id);
  }

  public NotFoundException referenceNotFound(UUID id) {
    return new NotFoundException("LOCAL_REFERENCE_NOT_FOUND", "error.masterdata.local.LOCAL_REFERENCE_NOT_FOUND",
        "Local reference not found", id);
  }

  public UnprocessableEntityException invalid(String code, String message) {
    return new UnprocessableEntityException(code, "error.masterdata.local." + code, message);
  }

  public LocalCommandBadRequestException bad(String message) {
    return new LocalCommandBadRequestException(message);
  }
}

package com.digiaudit.grcpc.modules.basicdata.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.common.security.*;
import com.digiaudit.grcpc.modules.basicdata.domain.*;
import com.digiaudit.grcpc.modules.datasetprofile.application.ProfileAccessService;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class BasicDataService {
    private final BasicDataRepository repository;
    private final ProfileAccessService access;
    private final CurrentUserProvider user;
    private final AuditService audit;
    public record Save(@NotBlank @Size(max = 255) String name, @Size(max = 2000) String description, Long version) {}

    @Transactional(readOnly = true)
    public List<BasicDataType> list(BasicDataKind kind, boolean management) {
        if (management) access.requireManager();
        return repository.list(kind, ProfileContext.requireId()).stream().filter(row -> !"DELETED".equals(row.status())).toList();
    }
    @Transactional
    public BasicDataType save(BasicDataKind kind, UUID id, Save command, HttpServletRequest http) {
        access.requireManager();
        UUID profile = ProfileContext.requireId(), key = id == null ? UUID.randomUUID() : id;
        BasicDataType current = id == null ? null : find(kind, id);
        if (current != null) {
            version(current, command.version());
            if ("DELETED".equals(current.status())) throw invalid();
        }
        String name = command.name().trim();
        if (name.isEmpty()) throw invalid();
        if (repository.nameExists(kind, profile, name, key)) throw new ConflictException("BASIC_DATA_DUPLICATE_NAME", "basicData.duplicateName", "A type with this name already exists in this profile");
        UUID actor = user.getCurrentUserIdOrNull();
        if (current == null) repository.insert(kind, profile, key, name, command.description(), actor);
        else if (!repository.update(kind, profile, key, current.version(), name, command.description(), current.status(), actor)) throw conflict();
        record(kind, key, current == null ? "CREATE" : "UPDATE", http);
        return find(kind, key);
    }
    @Transactional
    public BasicDataType lifecycle(BasicDataKind kind, UUID id, String command, Long expected, HttpServletRequest http) {
        access.requireManager();
        BasicDataType current = find(kind, id); version(current, expected);
        String status = switch (command) {
            case "activate" -> { if (!"INACTIVE".equals(current.status())) throw invalid(); yield "ACTIVE"; }
            case "inactivate" -> { if (!"ACTIVE".equals(current.status())) throw invalid(); yield "INACTIVE"; }
            case "delete" -> { if ("DELETED".equals(current.status())) throw invalid(); yield "DELETED"; }
            default -> throw invalid();
        };
        if ("DELETED".equals(status) && repository.referenced(kind, ProfileContext.requireId(), id))
            throw new ConflictException("BASIC_DATA_IN_USE", "basicData.inUse", "This type is in use and cannot be deleted; inactivate it instead");
        if (!repository.update(kind, ProfileContext.requireId(), id, current.version(), current.name(), current.description(), status, user.getCurrentUserIdOrNull())) throw conflict();
        record(kind, id, command.toUpperCase(Locale.ROOT), http); return find(kind, id);
    }
    /** Called inside the owning Organization/Document transaction, after its guards. */
    public UUID requireType(BasicDataKind kind, UUID id, UUID previousId) {
        if (id == null) throw new UnprocessableEntityException("BASIC_DATA_TYPE_REQUIRED", "basicData.typeRequired", "A type is required");
        BasicDataType row = find(kind, id);
        if ("DELETED".equals(row.status()) || (!"ACTIVE".equals(row.status()) && !id.equals(previousId)))
            throw new UnprocessableEntityException("BASIC_DATA_TYPE_INACTIVE", "basicData.typeInactive", "Choose an active type in the selected profile");
        return id;
    }
    public UUID organizationType(UUID requested, String legacyCode, UUID previousId) {
        UUID id = requested != null ? requested : previousId != null ? previousId
                : repository.legacyOrganizationType(ProfileContext.requireId(), legacyCode).orElse(null);
        return requireType(BasicDataKind.ORGANIZATION_TYPE, id, previousId);
    }
    public String legacyOrganizationCode(UUID id) {
        String code = repository.legacyOrganizationCode(ProfileContext.requireId(), id);
        return code == null ? "OTHER" : code;
    }
    public String name(BasicDataKind kind, UUID id) { return id == null ? null : find(kind, id).name(); }
    private BasicDataType find(BasicDataKind kind, UUID id) {
        return repository.find(kind, ProfileContext.requireId(), id).orElseThrow(() ->
                new NotFoundException("BASIC_DATA_NOT_FOUND", "basicData.notFound", "Type was not found in the selected profile"));
    }
    private void version(BasicDataType row, Long expected) { if (expected == null || expected != row.version()) throw conflict(); }
    private ConflictException conflict() { return new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", "Basic data version conflict"); }
    private UnprocessableEntityException invalid() { return new UnprocessableEntityException("INVALID_BASIC_DATA", "basicData.invalid", "Invalid basic data operation"); }
    private void record(BasicDataKind kind, UUID id, String operation, HttpServletRequest http) {
        audit.log(AuditEventType.BASIC_DATA_CHANGED, kind == BasicDataKind.ORGANIZATION_TYPE ? AuditTargetType.ORGANIZATION_TYPE : AuditTargetType.DOCUMENT_TYPE,
                id.toString(), ActionResult.SUCCESS, user.getCurrentUserIdOrNull(), http,
                Map.of("operation", operation, "profileId", ProfileContext.requireId().toString()));
    }
}

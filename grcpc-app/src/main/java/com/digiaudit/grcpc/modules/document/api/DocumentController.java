package com.digiaudit.grcpc.modules.document.api;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAddVersionRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCreateRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkSummaryResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentMetadataUpdateRequest;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands;
import com.digiaudit.grcpc.modules.document.application.DocumentFailures;
import com.digiaudit.grcpc.modules.document.application.DocumentReadService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/master-data/documents")
public class DocumentController {
    private final DocumentCommandService commandService;
    private final DocumentReadService readService;

    public DocumentController(DocumentCommandService commandService, DocumentReadService readService) {
        this.commandService = commandService;
        this.readService = readService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse create(@Valid @RequestBody DocumentCreateRequest request) {
        return commandService.createLinkedDocument(new DocumentCommands.CreateLinkedDocument(
                request.tempUploadId(),
                request.code(),
                request.title(),
                request.description(),
                request.documentCategoryCode(),
                targetType(request.targetType()),
                request.targetId(),
                request.validFrom(),
                request.validTo()
        ));
    }

    @GetMapping("/{documentId}")
    @PreAuthorize("hasAuthority('DOCUMENT_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<DocumentLinkSummaryResponse> get(@PathVariable UUID documentId) {
        return readService.getDocument(documentId);
    }

    @GetMapping("/{documentId}/versions")
    @PreAuthorize("hasAuthority('DOCUMENT_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<DocumentLinkSummaryResponse> versions(@PathVariable UUID documentId) {
        return readService.listVersions(documentId);
    }

    @PostMapping("/{documentId}/versions")
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse addVersion(
            @PathVariable UUID documentId,
            @Valid @RequestBody DocumentAddVersionRequest request
    ) {
        return commandService.addVersion(new DocumentCommands.AddVersion(
                documentId,
                request.tempUploadId(),
                request.expectedDocumentVersion(),
                targetType(request.targetType()),
                request.targetId(),
                request.validFrom(),
                request.validTo()
        ));
    }

    @PatchMapping("/{documentId}")
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse updateMetadata(
            @PathVariable UUID documentId,
            @Valid @RequestBody DocumentMetadataUpdateRequest request
    ) {
        return commandService.updateMetadata(new DocumentCommands.UpdateMetadata(
                documentId,
                request.expectedVersion(),
                targetType(request.targetType()),
                request.targetId(),
                request.code(),
                request.title(),
                request.description(),
                request.documentCategoryCode(),
                request.validFrom(),
                request.validTo()
        ));
    }

    @PostMapping("/{documentId}/activate")
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse activate(@PathVariable UUID documentId, @Valid @RequestBody DocumentLifecycleCommandRequest request) {
        return lifecycle(documentId, request, DocumentCommands.LifecycleAction.ACTIVATE);
    }

    @PostMapping("/{documentId}/inactivate")
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse inactivate(@PathVariable UUID documentId, @Valid @RequestBody DocumentLifecycleCommandRequest request) {
        return lifecycle(documentId, request, DocumentCommands.LifecycleAction.INACTIVATE);
    }

    @PostMapping("/{documentId}/delete")
    @PreAuthorize("hasAuthority('DOCUMENT_DELETE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse delete(@PathVariable UUID documentId, @Valid @RequestBody DocumentLifecycleCommandRequest request) {
        return lifecycle(documentId, request, DocumentCommands.LifecycleAction.DELETE);
    }

    @PostMapping("/{documentId}/restore")
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse restore(@PathVariable UUID documentId, @Valid @RequestBody DocumentLifecycleCommandRequest request) {
        return lifecycle(documentId, request, DocumentCommands.LifecycleAction.RESTORE);
    }

    private DocumentCommandResponse lifecycle(
            UUID documentId,
            DocumentLifecycleCommandRequest request,
            DocumentCommands.LifecycleAction action
    ) {
        return commandService.documentLifecycle(new DocumentCommands.DocumentLifecycle(
                documentId,
                request.expectedVersion(),
                targetType(request.targetType()),
                request.targetId(),
                action
        ));
    }

    private DocumentLinkTargetType targetType(String wireValue) {
        try {
            return DocumentLinkTargetType.fromPublicWireValue(wireValue);
        } catch (IllegalArgumentException ex) {
            throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed");
        }
    }
}

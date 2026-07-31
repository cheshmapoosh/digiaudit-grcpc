package com.digiaudit.grcpc.modules.document.api;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentDownloadResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkCreateRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkSummaryResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands;
import com.digiaudit.grcpc.modules.document.application.DocumentFailures;
import com.digiaudit.grcpc.modules.document.application.DocumentReadService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/master-data/document-versions")
public class DocumentVersionController {
    private final DocumentCommandService commandService;
    private final DocumentReadService readService;

    public DocumentVersionController(DocumentCommandService commandService, DocumentReadService readService) {
        this.commandService = commandService;
        this.readService = readService;
    }

    @GetMapping("/{documentVersionId}")
    @PreAuthorize("hasAuthority('DOCUMENT_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<DocumentLinkSummaryResponse> get(@PathVariable UUID documentVersionId) {
        return readService.getDocumentVersion(documentVersionId);
    }

    @PostMapping("/{documentVersionId}/links")
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse link(
            @PathVariable UUID documentVersionId,
            @Valid @RequestBody DocumentLinkCreateRequest request
    ) {
        return commandService.linkExistingVersion(new DocumentCommands.LinkExistingVersion(
                documentVersionId,
                targetType(request.targetType()),
                request.targetId()
        ));
    }

    @PostMapping("/{documentVersionId}/download")
    @PreAuthorize("hasAuthority('DOCUMENT_DOWNLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentDownloadResponse download(@PathVariable UUID documentVersionId) {
        return readService.createDownload(documentVersionId);
    }

    private DocumentLinkTargetType targetType(String wireValue) {
        try {
            return DocumentLinkTargetType.fromPublicWireValue(wireValue);
        } catch (IllegalArgumentException ex) {
            throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed");
        }
    }
}

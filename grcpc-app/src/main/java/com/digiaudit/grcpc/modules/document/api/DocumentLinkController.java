package com.digiaudit.grcpc.modules.document.api;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkSummaryResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands;
import com.digiaudit.grcpc.modules.document.application.DocumentReadService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/master-data/document-links")
public class DocumentLinkController {
    private final DocumentCommandService commandService;
    private final DocumentReadService readService;

    public DocumentLinkController(DocumentCommandService commandService, DocumentReadService readService) {
        this.commandService = commandService;
        this.readService = readService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DOCUMENT_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<DocumentLinkSummaryResponse> list(
            @RequestParam @NotBlank @Size(max = 32) String targetType,
            @RequestParam @NotNull UUID targetId
    ) {
        return readService.listByTarget(targetType, targetId);
    }

    @PostMapping("/{documentLinkId}/activate")
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse activate(@PathVariable UUID documentLinkId, @Valid @RequestBody DocumentLinkLifecycleCommandRequest request) {
        return lifecycle(documentLinkId, request, DocumentCommands.LifecycleAction.ACTIVATE);
    }

    @PostMapping("/{documentLinkId}/inactivate")
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse inactivate(@PathVariable UUID documentLinkId, @Valid @RequestBody DocumentLinkLifecycleCommandRequest request) {
        return lifecycle(documentLinkId, request, DocumentCommands.LifecycleAction.INACTIVATE);
    }

    @PostMapping("/{documentLinkId}/delete")
    @PreAuthorize("hasAuthority('DOCUMENT_DELETE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse delete(@PathVariable UUID documentLinkId, @Valid @RequestBody DocumentLinkLifecycleCommandRequest request) {
        return lifecycle(documentLinkId, request, DocumentCommands.LifecycleAction.DELETE);
    }

    @PostMapping("/{documentLinkId}/restore")
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentCommandResponse restore(@PathVariable UUID documentLinkId, @Valid @RequestBody DocumentLinkLifecycleCommandRequest request) {
        return lifecycle(documentLinkId, request, DocumentCommands.LifecycleAction.RESTORE);
    }

    private DocumentCommandResponse lifecycle(
            UUID documentLinkId,
            DocumentLinkLifecycleCommandRequest request,
            DocumentCommands.LifecycleAction action
    ) {
        return commandService.linkLifecycle(new DocumentCommands.LinkLifecycle(
                documentLinkId,
                request.expectedVersion(),
                action
        ));
    }
}

package com.digiaudit.grcpc.modules.document.api;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAttachmentResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentDownloadUrlResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentAttachmentService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentAttachmentController {

    private final DocumentAttachmentService service;

    @GetMapping
    @PreAuthorize("hasAuthority('DOCUMENT_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<DocumentAttachmentResponse> list(@RequestParam String targetType, @RequestParam UUID targetId) {
        log.debug("REST request to list documents. targetType={}, targetId={}", targetType, targetId);
        return service.list(targetType, targetId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentAttachmentResponse upload(
            @RequestParam String targetType,
            @RequestParam UUID targetId,
            @RequestPart("file") MultipartFile file,
            HttpServletRequest httpRequest
    ) {
        return service.upload(targetType, targetId, file, httpRequest);
    }

    @GetMapping("/{id}/download-url")
    @PreAuthorize("hasAuthority('DOCUMENT_DOWNLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentDownloadUrlResponse createDownloadUrl(@PathVariable UUID id) {
        return service.createDownloadUrl(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('DOCUMENT_DELETE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        service.delete(id, httpRequest);
    }
}

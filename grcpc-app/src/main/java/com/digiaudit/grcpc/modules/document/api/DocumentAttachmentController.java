package com.digiaudit.grcpc.modules.document.api;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAttachmentResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommitRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentDownloadUrlResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentTitleUpdateRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentUploadPolicyResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentAttachmentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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

    @GetMapping("/temp")
    @PreAuthorize("hasAuthority('DOCUMENT_VIEW') or hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<DocumentAttachmentResponse> listTemp(
            @RequestParam String targetType,
            @RequestParam UUID tempSessionId
    ) {
        log.debug("REST request to list temp documents. targetType={}, tempSessionId={}", targetType, tempSessionId);
        return service.listTemp(targetType, tempSessionId);
    }

    @GetMapping("/upload-policy")
    @PreAuthorize("hasAuthority('DOCUMENT_VIEW') or hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentUploadPolicyResponse uploadPolicy(@RequestParam String targetType) {
        return service.uploadPolicy(targetType);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentAttachmentResponse upload(
            @RequestParam String targetType,
            @RequestParam UUID targetId,
            @RequestParam(required = false) String title,
            @RequestPart("file") MultipartFile file,
            HttpServletRequest httpRequest
    ) {
        return service.upload(targetType, targetId, title, file, httpRequest);
    }

    @PostMapping("/temp")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentAttachmentResponse uploadTemp(
            @RequestParam String targetType,
            @RequestParam UUID tempSessionId,
            @RequestParam(required = false) UUID targetId,
            @RequestParam(required = false) String title,
            @RequestPart("file") MultipartFile file,
            HttpServletRequest httpRequest
    ) {
        return service.uploadTemp(targetType, targetId, tempSessionId, title, file, httpRequest);
    }

    @PostMapping("/commit")
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<DocumentAttachmentResponse> commitTemp(
            @Valid @RequestBody DocumentCommitRequest request,
            HttpServletRequest httpRequest
    ) {
        return service.commitTemp(request, httpRequest);
    }

    @GetMapping("/{id}/download-url")
    @PreAuthorize("hasAuthority('DOCUMENT_DOWNLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentDownloadUrlResponse createDownloadUrl(@PathVariable UUID id) {
        return service.createDownloadUrl(id);
    }

    @PatchMapping("/{id}/title")
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentAttachmentResponse updateTitle(
            @PathVariable UUID id,
            @Valid @RequestBody DocumentTitleUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        return service.updateTitle(id, request, httpRequest);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('DOCUMENT_DELETE') or hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        service.delete(id, httpRequest);
    }
}

package com.digiaudit.grcpc.modules.document.api;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentTemporaryUploadResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentTemporaryUploadService;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/master-data/document-temporary-uploads")
public class DocumentTemporaryUploadController {
    private final DocumentTemporaryUploadService service;

    public DocumentTemporaryUploadController(DocumentTemporaryUploadService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentTemporaryUploadResponse upload(@RequestPart("file") @NotNull MultipartFile file) {
        return service.upload(file);
    }

    @GetMapping("/{tempUploadId}")
    @PreAuthorize("hasAuthority('DOCUMENT_VIEW') or hasAuthority('DOCUMENT_UPLOAD') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DocumentTemporaryUploadResponse get(@PathVariable UUID tempUploadId) {
        return service.get(tempUploadId);
    }
}

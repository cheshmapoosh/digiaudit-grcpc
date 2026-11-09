package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentTempUploadEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.InternalDocumentTempUploadJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DocumentTemporaryUploadWriter {
    private final InternalDocumentTempUploadJpaRepository repository;

    @Transactional
    public DocumentTempUploadEntity saveVerifiedUpload(DocumentTempUploadEntity upload) {
        return repository.saveAndFlush(upload);
    }
}

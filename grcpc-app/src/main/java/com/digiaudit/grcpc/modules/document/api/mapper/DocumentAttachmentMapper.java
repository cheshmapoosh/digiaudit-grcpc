package com.digiaudit.grcpc.modules.document.api.mapper;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAttachmentResponse;
import com.digiaudit.grcpc.modules.document.domain.entity.DocumentAttachmentEntity;
import com.digiaudit.grcpc.modules.document.domain.entity.DocumentTempUploadEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface DocumentAttachmentMapper {
    DocumentAttachmentResponse toResponse(DocumentAttachmentEntity entity);

    @Mapping(target = "status", constant = "TEMP")
    @Mapping(target = "committedAt", ignore = true)
    DocumentAttachmentResponse toResponse(DocumentTempUploadEntity entity);
}

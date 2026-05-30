package com.digiaudit.grcpc.modules.document.api.mapper;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAttachmentResponse;
import com.digiaudit.grcpc.modules.document.domain.entity.DocumentAttachmentEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DocumentAttachmentMapper {
    DocumentAttachmentResponse toResponse(DocumentAttachmentEntity entity);
}

package com.digiaudit.grcpc.modules.organization.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalContextDtos;
import java.util.List;
import java.util.UUID;

public record OrganizationAggregateMutationResponse(
        UUID entityId, UUID revisionId, long version, List<DocumentCommandResponse> finalizedDocuments,
        OrganizationResponse organization,
        LocalContextDtos.Selection subprocesses,
        com.digiaudit.grcpc.modules.masterdata.local.api.dto.OrganizationLocalDtos.Result localRelationships) {}

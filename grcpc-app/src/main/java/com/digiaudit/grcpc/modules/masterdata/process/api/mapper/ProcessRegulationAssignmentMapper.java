package com.digiaudit.grcpc.modules.masterdata.process.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessRegulationAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessRegulationAssignmentEntity;
import com.digiaudit.grcpc.modules.regulation.domain.entity.RegulationEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProcessRegulationAssignmentMapper {

    @Mapping(source = "assignment.id", target = "assignmentId")
    @Mapping(source = "assignment.processNodeId", target = "processNodeId")
    @Mapping(source = "assignment.regulationNodeId", target = "regulationNodeId")
    @Mapping(source = "assignment.active", target = "isActive")
    @Mapping(source = "assignment.createdAt", target = "createdAt")
    @Mapping(source = "assignment.updatedAt", target = "updatedAt")
    @Mapping(source = "regulation.code", target = "code")
    @Mapping(source = "regulation.title", target = "title")
    @Mapping(source = "regulation.description", target = "description")
    @Mapping(source = "regulation.issuer", target = "issuer")
    @Mapping(source = "regulation.status", target = "status")
    @Mapping(source = "regulation.effectiveDate", target = "validFrom")
    @Mapping(source = "regulation.validTo", target = "validTo")
    ProcessRegulationAssignmentResponse toResponse(
            ProcessRegulationAssignmentEntity assignment,
            RegulationEntity regulation
    );
}

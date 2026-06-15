package com.digiaudit.grcpc.modules.masterdata.process.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessRiskAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessRiskAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.entity.RiskNodeEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProcessRiskAssignmentMapper {

    @Mapping(source = "assignment.id", target = "assignmentId")
    @Mapping(source = "assignment.processNodeId", target = "processNodeId")
    @Mapping(source = "assignment.riskNodeId", target = "riskNodeId")
    @Mapping(source = "assignment.assignmentType", target = "assignmentType")
    @Mapping(source = "assignment.validFrom", target = "validFrom")
    @Mapping(source = "assignment.validTo", target = "validTo")
    @Mapping(source = "assignment.active", target = "isActive")
    @Mapping(source = "assignment.createdAt", target = "createdAt")
    @Mapping(source = "assignment.updatedAt", target = "updatedAt")
    @Mapping(source = "risk.code", target = "code")
    @Mapping(source = "risk.title", target = "title")
    @Mapping(source = "risk.description", target = "description")
    @Mapping(source = "risk.nodeType", target = "nodeType")
    @Mapping(source = "risk.riskType", target = "riskType")
    @Mapping(source = "risk.status", target = "status")
    ProcessRiskAssignmentResponse toResponse(
            ProcessRiskAssignmentEntity assignment,
            RiskNodeEntity risk
    );
}

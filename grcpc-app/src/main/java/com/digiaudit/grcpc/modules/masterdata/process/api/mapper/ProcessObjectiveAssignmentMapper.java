package com.digiaudit.grcpc.modules.masterdata.process.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.objective.domain.entity.ObjectiveNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessObjectiveAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessObjectiveAssignmentEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProcessObjectiveAssignmentMapper {

    @Mapping(source = "assignment.id", target = "assignmentId")
    @Mapping(source = "assignment.processNodeId", target = "processNodeId")
    @Mapping(source = "assignment.objectiveNodeId", target = "objectiveNodeId")
    @Mapping(source = "assignment.assignmentType", target = "assignmentType")
    @Mapping(source = "assignment.validFrom", target = "validFrom")
    @Mapping(source = "assignment.validTo", target = "validTo")
    @Mapping(source = "assignment.active", target = "isActive")
    @Mapping(source = "assignment.createdAt", target = "createdAt")
    @Mapping(source = "assignment.updatedAt", target = "updatedAt")
    @Mapping(source = "objective.code", target = "code")
    @Mapping(source = "objective.title", target = "title")
    @Mapping(source = "objective.description", target = "description")
    @Mapping(source = "objective.status", target = "status")
    ProcessObjectiveAssignmentResponse toResponse(
            ProcessObjectiveAssignmentEntity assignment,
            ObjectiveNodeEntity objective
    );
}

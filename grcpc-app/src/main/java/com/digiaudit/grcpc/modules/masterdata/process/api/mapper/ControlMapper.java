package com.digiaudit.grcpc.modules.masterdata.process.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.AttachExistingControlRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ControlDetailsDto;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ControlSummaryDto;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CreateControlAndAssignRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.UpdateControlAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ControlEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessNodeEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ControlMapper {

    ControlSummaryDto toSummary(ControlEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "status", constant = "active")
    ControlEntity toControlEntity(CreateControlAndAssignRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "controlId", ignore = true)
    @Mapping(target = "subProcessId", ignore = true)
    @Mapping(target = "assignmentStatus", constant = "active")
    ControlAssignmentEntity toAssignmentEntity(CreateControlAndAssignRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "controlId", ignore = true)
    @Mapping(target = "subProcessId", ignore = true)
    @Mapping(target = "assignmentStatus", constant = "active")
    ControlAssignmentEntity toAssignmentEntity(AttachExistingControlRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "controlId", ignore = true)
    @Mapping(target = "subProcessId", ignore = true)
    void updateAssignment(UpdateControlAssignmentRequest request, @MappingTarget ControlAssignmentEntity entity);

    @Mapping(source = "assignment.id", target = "controlAssignmentId")
    @Mapping(source = "control.id", target = "controlId")
    @Mapping(source = "control.code", target = "code")
    @Mapping(source = "control.name", target = "name")
    @Mapping(source = "control.description", target = "description")
    @Mapping(source = "control.controlClass", target = "controlClass")
    @Mapping(source = "control.controlNature", target = "controlNature")
    @Mapping(source = "control.automationType", target = "automationType")
    @Mapping(source = "control.importance", target = "importance")
    @Mapping(source = "control.objective", target = "objective")
    @Mapping(source = "control.status", target = "status")
    @Mapping(source = "parentProcess.id", target = "parentProcessId")
    @Mapping(source = "parentProcess.title", target = "parentProcessTitle")
    @Mapping(source = "subProcess.id", target = "parentSubProcessId")
    @Mapping(source = "subProcess.title", target = "parentSubProcessTitle")
    @Mapping(source = "assignment.ownerId", target = "ownerId")
    @Mapping(source = "assignment.ownerName", target = "ownerName")
    @Mapping(source = "assignment.validFrom", target = "validFrom")
    @Mapping(source = "assignment.validTo", target = "validTo")
    @Mapping(source = "assignment.sortOrder", target = "sortOrder")
    @Mapping(source = "assignment.operationPeriod", target = "operationPeriod")
    @Mapping(source = "assignment.testMethod", target = "testMethod")
    @Mapping(source = "assignment.testPlan", target = "testPlan")
    @Mapping(source = "assignment.assignmentStatus", target = "assignmentStatus")
    @Mapping(source = "assignment.createdAt", target = "createdAt")
    @Mapping(source = "assignment.updatedAt", target = "updatedAt")
    ControlDetailsDto toDetails(
            ControlAssignmentEntity assignment,
            ControlEntity control,
            ProcessNodeEntity subProcess,
            ProcessNodeEntity parentProcess
    );
}

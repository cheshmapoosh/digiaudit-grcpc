package com.digiaudit.grcpc.modules.masterdata.process.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.entity.AccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessAccountGroupAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessAccountGroupAssignmentEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProcessAccountGroupAssignmentMapper {

    @Mapping(source = "assignment.id", target = "assignmentId")
    @Mapping(source = "assignment.processNodeId", target = "processNodeId")
    @Mapping(source = "assignment.accountGroupId", target = "accountGroupId")
    @Mapping(source = "assignment.assignmentType", target = "assignmentType")
    @Mapping(source = "assignment.validFrom", target = "validFrom")
    @Mapping(source = "assignment.validTo", target = "validTo")
    @Mapping(source = "assignment.active", target = "isActive")
    @Mapping(source = "assignment.createdAt", target = "createdAt")
    @Mapping(source = "assignment.updatedAt", target = "updatedAt")
    @Mapping(source = "accountGroup.code", target = "code")
    @Mapping(source = "accountGroup.title", target = "title")
    @Mapping(source = "accountGroup.description", target = "description")
    @Mapping(source = "accountGroup.status", target = "status")
    ProcessAccountGroupAssignmentResponse toResponse(
            ProcessAccountGroupAssignmentEntity assignment,
            AccountGroupEntity accountGroup
    );
}

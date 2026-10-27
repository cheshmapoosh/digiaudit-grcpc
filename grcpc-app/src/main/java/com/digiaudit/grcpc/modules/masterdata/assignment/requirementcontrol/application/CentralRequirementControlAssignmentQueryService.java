package com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.mapper.CentralRequirementControlAssignmentMapper;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.domain.entity.CentralRequirementControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.domain.repository.CentralRequirementControlAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CentralRequirementControlAssignmentQueryService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralRequirementControlAssignmentRepository assignments;
  private final CentralControlRepository owners;
  private final CentralRegulationRequirementRepository destinations;
  private final CentralRequirementControlAssignmentMapper mapper;

  public CentralRequirementControlAssignmentQueryService(CentralRequirementControlAssignmentRepository assignments, CentralControlRepository owners,
      CentralRegulationRequirementRepository destinations, CentralRequirementControlAssignmentMapper mapper) {
    this.assignments = assignments; this.owners = owners; this.destinations = destinations; this.mapper = mapper;
  }

  public List<CentralRequirementControlAssignmentResponse> forControl(UUID id, boolean deleted) {
    CentralControlEntity owner = owners.findById(id).orElseThrow(() -> missing(id));
    List<CentralRequirementControlAssignmentEntity> rows = deleted ? assignments.findByControlIdAndStatus(id, DELETED)
        : assignments.findByControlIdAndStatusNot(id, DELETED);
    Map<UUID, CentralRegulationRequirementEntity> byId = destinations.findAllById(rows.stream().map(CentralRequirementControlAssignmentEntity::getRequirementId).toList())
        .stream().collect(Collectors.toMap(CentralRegulationRequirementEntity::getId, Function.identity()));
    return rows.stream().map(row -> mapper.response(row, owner, Objects.requireNonNull(byId.get(row.getRequirementId()))))
        .sorted(Comparator.comparing(CentralRequirementControlAssignmentResponse::requirementCode).thenComparing(CentralRequirementControlAssignmentResponse::assignmentId)).toList();
  }

  public List<CentralRequirementControlAssignmentResponse> forRequirement(UUID id) {
    CentralRegulationRequirementEntity destination = destinations.findById(id).orElseThrow(() -> missing(id));
    List<CentralRequirementControlAssignmentEntity> rows = assignments.findByRequirementIdAndStatusNot(id, DELETED);
    Map<UUID, CentralControlEntity> byId = owners.findAllById(rows.stream().map(CentralRequirementControlAssignmentEntity::getControlId).toList())
        .stream().collect(Collectors.toMap(CentralControlEntity::getId, Function.identity()));
    return rows.stream().map(row -> mapper.response(row, Objects.requireNonNull(byId.get(row.getControlId())), destination))
        .sorted(Comparator.comparing(CentralRequirementControlAssignmentResponse::controlCode).thenComparing(CentralRequirementControlAssignmentResponse::assignmentId)).toList();
  }

  public CentralRequirementControlAssignmentOptionsResponse options() {
    return new CentralRequirementControlAssignmentOptionsResponse(destinations.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(DELETED).stream()
        .sorted(Comparator.comparing(CentralRegulationRequirementEntity::getCode).thenComparing(CentralRegulationRequirementEntity::getId))
        .map(e -> new CentralRequirementControlAssignmentOptionsResponse.RequirementOption(e.getId(), e.getCode(), e.getTitle(), e.getStatus(), e.getValidFrom(), e.getValidTo())).toList());
  }

  private NotFoundException missing(UUID id) {
    return new NotFoundException("ASSIGNMENT_ENDPOINT_NOT_FOUND", "error.masterdata.centralAssignment.endpointNotFound", "Assignment endpoint not found", id);
  }
}

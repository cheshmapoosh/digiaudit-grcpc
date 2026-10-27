package com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api.mapper.CentralControlControlObjectiveAssignmentMapper;
import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.domain.entity.CentralControlControlObjectiveAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.domain.repository.CentralControlControlObjectiveAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CentralControlControlObjectiveAssignmentQueryService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralControlControlObjectiveAssignmentRepository assignments;
  private final CentralControlRepository owners;
  private final CentralControlObjectiveRepository destinations;
  private final CentralControlControlObjectiveAssignmentMapper mapper;

  public CentralControlControlObjectiveAssignmentQueryService(CentralControlControlObjectiveAssignmentRepository assignments, CentralControlRepository owners,
      CentralControlObjectiveRepository destinations, CentralControlControlObjectiveAssignmentMapper mapper) {
    this.assignments = assignments; this.owners = owners; this.destinations = destinations; this.mapper = mapper;
  }

  public List<CentralControlControlObjectiveAssignmentResponse> forControl(UUID id, boolean deleted) {
    CentralControlEntity owner = owners.findById(id).orElseThrow(() -> missing(id));
    List<CentralControlControlObjectiveAssignmentEntity> rows = deleted ? assignments.findByControlIdAndStatus(id, DELETED)
        : assignments.findByControlIdAndStatusNot(id, DELETED);
    Map<UUID, CentralControlObjectiveEntity> byId = destinations.findAllById(rows.stream().map(CentralControlControlObjectiveAssignmentEntity::getControlObjectiveId).toList())
        .stream().collect(Collectors.toMap(CentralControlObjectiveEntity::getId, Function.identity()));
    return rows.stream().map(row -> mapper.response(row, owner, Objects.requireNonNull(byId.get(row.getControlObjectiveId()))))
        .sorted(Comparator.comparing(CentralControlControlObjectiveAssignmentResponse::controlObjectiveCode).thenComparing(CentralControlControlObjectiveAssignmentResponse::assignmentId)).toList();
  }

  public List<CentralControlControlObjectiveAssignmentResponse> forControlObjective(UUID id) {
    CentralControlObjectiveEntity destination = destinations.findById(id).orElseThrow(() -> missing(id));
    List<CentralControlControlObjectiveAssignmentEntity> rows = assignments.findByControlObjectiveIdAndStatusNot(id, DELETED);
    Map<UUID, CentralControlEntity> byId = owners.findAllById(rows.stream().map(CentralControlControlObjectiveAssignmentEntity::getControlId).toList())
        .stream().collect(Collectors.toMap(CentralControlEntity::getId, Function.identity()));
    return rows.stream().map(row -> mapper.response(row, Objects.requireNonNull(byId.get(row.getControlId())), destination))
        .sorted(Comparator.comparing(CentralControlControlObjectiveAssignmentResponse::controlCode).thenComparing(CentralControlControlObjectiveAssignmentResponse::assignmentId)).toList();
  }

  public CentralControlControlObjectiveAssignmentOptionsResponse options() {
    return new CentralControlControlObjectiveAssignmentOptionsResponse(destinations.findByStatusNotOrderByTitleAscIdAsc(DELETED).stream()
        .sorted(Comparator.comparing(CentralControlObjectiveEntity::getCode).thenComparing(CentralControlObjectiveEntity::getId))
        .map(e -> new CentralControlControlObjectiveAssignmentOptionsResponse.ControlObjectiveOption(e.getId(), e.getCode(), e.getTitle(), e.getStatus(), e.getValidFrom(), e.getValidTo())).toList());
  }

  private NotFoundException missing(UUID id) {
    return new NotFoundException("ASSIGNMENT_ENDPOINT_NOT_FOUND", "error.masterdata.centralAssignment.endpointNotFound", "Assignment endpoint not found", id);
  }
}

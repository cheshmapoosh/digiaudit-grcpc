package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.mapper.CentralRiskControlObjectiveAssignmentMapper;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.domain.entity.CentralRiskControlObjectiveAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.domain.repository.CentralRiskControlObjectiveAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CentralRiskControlObjectiveAssignmentQueryService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralRiskControlObjectiveAssignmentRepository assignments;
  private final CentralControlObjectiveRepository owners;
  private final CentralRiskTemplateRepository destinations;
  private final CentralRiskControlObjectiveAssignmentMapper mapper;

  public CentralRiskControlObjectiveAssignmentQueryService(CentralRiskControlObjectiveAssignmentRepository assignments, CentralControlObjectiveRepository owners,
      CentralRiskTemplateRepository destinations, CentralRiskControlObjectiveAssignmentMapper mapper) {
    this.assignments = assignments; this.owners = owners; this.destinations = destinations; this.mapper = mapper;
  }

  public List<CentralRiskControlObjectiveAssignmentResponse> forControlObjective(UUID id, boolean deleted) {
    CentralControlObjectiveEntity owner = owners.findById(id).orElseThrow(() -> missing(id));
    List<CentralRiskControlObjectiveAssignmentEntity> rows = deleted ? assignments.findByControlObjectiveIdAndStatus(id, DELETED)
        : assignments.findByControlObjectiveIdAndStatusNot(id, DELETED);
    Map<UUID, CentralRiskTemplateEntity> byId = destinations.findAllById(rows.stream().map(CentralRiskControlObjectiveAssignmentEntity::getRiskTemplateId).toList())
        .stream().collect(Collectors.toMap(CentralRiskTemplateEntity::getId, Function.identity()));
    return rows.stream().map(row -> mapper.response(row, owner, Objects.requireNonNull(byId.get(row.getRiskTemplateId()))))
        .sorted(Comparator.comparing(CentralRiskControlObjectiveAssignmentResponse::riskTemplateCode).thenComparing(CentralRiskControlObjectiveAssignmentResponse::assignmentId)).toList();
  }

  public List<CentralRiskControlObjectiveAssignmentResponse> forRiskTemplate(UUID id) {
    CentralRiskTemplateEntity destination = destinations.findById(id).orElseThrow(() -> missing(id));
    List<CentralRiskControlObjectiveAssignmentEntity> rows = assignments.findByRiskTemplateIdAndStatusNot(id, DELETED);
    Map<UUID, CentralControlObjectiveEntity> byId = owners.findAllById(rows.stream().map(CentralRiskControlObjectiveAssignmentEntity::getControlObjectiveId).toList())
        .stream().collect(Collectors.toMap(CentralControlObjectiveEntity::getId, Function.identity()));
    return rows.stream().map(row -> mapper.response(row, Objects.requireNonNull(byId.get(row.getControlObjectiveId())), destination))
        .sorted(Comparator.comparing(CentralRiskControlObjectiveAssignmentResponse::controlObjectiveCode).thenComparing(CentralRiskControlObjectiveAssignmentResponse::assignmentId)).toList();
  }

  public CentralRiskControlObjectiveAssignmentOptionsResponse options() {
    return new CentralRiskControlObjectiveAssignmentOptionsResponse(destinations.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(DELETED).stream()
        .sorted(Comparator.comparing(CentralRiskTemplateEntity::getCode).thenComparing(CentralRiskTemplateEntity::getId))
        .map(e -> new CentralRiskControlObjectiveAssignmentOptionsResponse.RiskTemplateOption(e.getId(), e.getCode(), e.getTitle(), e.getStatus(), e.getValidFrom(), e.getValidTo())).toList());
  }

  private NotFoundException missing(UUID id) {
    return new NotFoundException("ASSIGNMENT_ENDPOINT_NOT_FOUND", "error.masterdata.centralAssignment.endpointNotFound", "Assignment endpoint not found", id);
  }
}

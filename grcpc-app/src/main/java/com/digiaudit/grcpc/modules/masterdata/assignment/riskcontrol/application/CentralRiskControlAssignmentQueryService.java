package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.mapper.CentralRiskControlAssignmentMapper;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.domain.entity.CentralRiskControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.domain.repository.CentralRiskControlAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
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
public class CentralRiskControlAssignmentQueryService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralRiskControlAssignmentRepository assignments;
  private final CentralControlRepository owners;
  private final CentralRiskTemplateRepository destinations;
  private final CentralRiskControlAssignmentMapper mapper;

  public CentralRiskControlAssignmentQueryService(CentralRiskControlAssignmentRepository assignments, CentralControlRepository owners,
      CentralRiskTemplateRepository destinations, CentralRiskControlAssignmentMapper mapper) {
    this.assignments = assignments; this.owners = owners; this.destinations = destinations; this.mapper = mapper;
  }

  public List<CentralRiskControlAssignmentResponse> forControl(UUID id, boolean deleted) {
    CentralControlEntity owner = owners.findById(id).orElseThrow(() -> missing(id));
    List<CentralRiskControlAssignmentEntity> rows = deleted ? assignments.findByControlIdAndStatus(id, DELETED)
        : assignments.findByControlIdAndStatusNot(id, DELETED);
    Map<UUID, CentralRiskTemplateEntity> byId = destinations.findAllById(rows.stream().map(CentralRiskControlAssignmentEntity::getRiskTemplateId).toList())
        .stream().collect(Collectors.toMap(CentralRiskTemplateEntity::getId, Function.identity()));
    return rows.stream().map(row -> mapper.response(row, owner, Objects.requireNonNull(byId.get(row.getRiskTemplateId()))))
        .sorted(Comparator.comparing(CentralRiskControlAssignmentResponse::riskTemplateCode).thenComparing(CentralRiskControlAssignmentResponse::assignmentId)).toList();
  }

  public List<CentralRiskControlAssignmentResponse> forRiskTemplate(UUID id) {
    CentralRiskTemplateEntity destination = destinations.findById(id).orElseThrow(() -> missing(id));
    List<CentralRiskControlAssignmentEntity> rows = assignments.findByRiskTemplateIdAndStatusNot(id, DELETED);
    Map<UUID, CentralControlEntity> byId = owners.findAllById(rows.stream().map(CentralRiskControlAssignmentEntity::getControlId).toList())
        .stream().collect(Collectors.toMap(CentralControlEntity::getId, Function.identity()));
    return rows.stream().map(row -> mapper.response(row, Objects.requireNonNull(byId.get(row.getControlId())), destination))
        .sorted(Comparator.comparing(CentralRiskControlAssignmentResponse::controlCode).thenComparing(CentralRiskControlAssignmentResponse::assignmentId)).toList();
  }

  public CentralRiskControlAssignmentOptionsResponse options() {
    return new CentralRiskControlAssignmentOptionsResponse(destinations.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(DELETED).stream()
        .sorted(Comparator.comparing(CentralRiskTemplateEntity::getCode).thenComparing(CentralRiskTemplateEntity::getId))
        .map(e -> new CentralRiskControlAssignmentOptionsResponse.RiskTemplateOption(e.getId(), e.getCode(), e.getTitle(), e.getStatus(), e.getValidFrom(), e.getValidTo())).toList());
  }

  private NotFoundException missing(UUID id) {
    return new NotFoundException("ASSIGNMENT_ENDPOINT_NOT_FOUND", "error.masterdata.centralAssignment.endpointNotFound", "Assignment endpoint not found", id);
  }
}

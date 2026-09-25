package com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.api.dto.CentralRequirementControlCoverageOptionsResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.api.dto.CentralSubprocessRequirementControlCoverageResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.api.mapper.CentralSubprocessRequirementControlCoverageMapper;
import com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.domain.entity.CentralSubprocessRequirementControlCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.domain.repository.CentralSubprocessRequirementControlCoverageRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.control.application.CentralSubprocessControlScopeQueryService;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository.CentralSubprocessControlScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.application.CentralSubprocessRequirementScopeQueryService;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.entity.CentralSubprocessRequirementScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.repository.CentralSubprocessRequirementScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralSubprocessRequirementControlCoverageQueryService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralSubprocessRequirementControlCoverageRepository coverages;
  private final CentralSubprocessRepository subprocesses;
  private final CentralSubprocessRequirementScopeRepository requirementScopes;
  private final CentralSubprocessControlScopeRepository controlScopes;
  private final CentralRegulationRequirementRepository requirements;
  private final CentralControlRepository controls;
  private final CentralSubprocessRequirementScopeQueryService requirementScopeQueries;
  private final CentralSubprocessControlScopeQueryService controlScopeQueries;
  private final CentralSubprocessRequirementControlCoverageMapper mapper;

  public CentralSubprocessRequirementControlCoverageQueryService(CentralSubprocessRequirementControlCoverageRepository coverages, CentralSubprocessRepository subprocesses, CentralSubprocessRequirementScopeRepository requirementScopes, CentralSubprocessControlScopeRepository controlScopes, CentralRegulationRequirementRepository requirements, CentralControlRepository controls, CentralSubprocessRequirementScopeQueryService requirementScopeQueries, CentralSubprocessControlScopeQueryService controlScopeQueries, CentralSubprocessRequirementControlCoverageMapper mapper) {
    this.coverages=coverages; this.subprocesses=subprocesses; this.requirementScopes=requirementScopes; this.controlScopes=controlScopes; this.requirements=requirements; this.controls=controls; this.requirementScopeQueries=requirementScopeQueries; this.controlScopeQueries=controlScopeQueries; this.mapper=mapper;
  }

  @Transactional(readOnly=true) public List<CentralSubprocessRequirementControlCoverageResponse> listForSubprocess(UUID subprocessId, MasterDataLifecycleStatus status, String search) { validateNormalStatus(status); requireSubprocess(subprocessId); return map(status==null?coverages.findBySubprocessIdAndStatusNot(subprocessId,DELETED):coverages.findBySubprocessIdAndStatus(subprocessId,status),search); }
  @Transactional(readOnly=true) public List<CentralSubprocessRequirementControlCoverageResponse> deleted(UUID subprocessId, String search) { requireSubprocess(subprocessId); return map(coverages.findBySubprocessIdAndStatus(subprocessId,DELETED),search); }
  @Transactional(readOnly=true) public CentralSubprocessRequirementControlCoverageResponse detail(UUID subprocessId, UUID coverageId) { CentralSubprocessRequirementControlCoverageEntity row=coverages.findById(coverageId).orElseThrow(()->notFound(coverageId)); if(!row.getSubprocessId().equals(subprocessId)||row.getStatus()==DELETED)throw notFound(coverageId); return mapOne(row); }
  @Transactional(readOnly=true) public CentralRequirementControlCoverageOptionsResponse options(UUID subprocessId) { requireSubprocess(subprocessId); return new CentralRequirementControlCoverageOptionsResponse(requirementScopeQueries.listForSubprocess(subprocessId,null,null),controlScopeQueries.listForSubprocess(subprocessId,null,null)); }
  @Transactional(readOnly=true) public List<CentralSubprocessRequirementControlCoverageResponse> listForControl(UUID controlId,String search){ List<UUID> ids=controlScopes.findByControlIdAndStatusNot(controlId,DELETED).stream().map(CentralSubprocessControlScopeEntity::getId).toList(); return ids.isEmpty()?List.of():map(coverages.findByControlScopeIdInAndStatusNot(ids,DELETED),search); }
  @Transactional(readOnly=true) public List<CentralSubprocessRequirementControlCoverageResponse> listForRequirement(UUID requirementId,String search){ List<UUID> ids=requirementScopes.findByRequirementIdAndStatusNot(requirementId,DELETED).stream().map(CentralSubprocessRequirementScopeEntity::getId).toList(); return ids.isEmpty()?List.of():map(coverages.findByRequirementScopeIdInAndStatusNot(ids,DELETED),search); }

  private List<CentralSubprocessRequirementControlCoverageResponse> map(List<CentralSubprocessRequirementControlCoverageEntity> rows,String search){ if(rows.isEmpty())return List.of(); Map<UUID,CentralSubprocessEntity> sp=index(subprocesses.findAllById(rows.stream().map(CentralSubprocessRequirementControlCoverageEntity::getSubprocessId).toList()),CentralSubprocessEntity::getId); Map<UUID,CentralSubprocessRequirementScopeEntity> rs=index(requirementScopes.findAllById(rows.stream().map(CentralSubprocessRequirementControlCoverageEntity::getRequirementScopeId).toList()),CentralSubprocessRequirementScopeEntity::getId); Map<UUID,CentralSubprocessControlScopeEntity> cs=index(controlScopes.findAllById(rows.stream().map(CentralSubprocessRequirementControlCoverageEntity::getControlScopeId).toList()),CentralSubprocessControlScopeEntity::getId); Map<UUID,CentralRegulationRequirementEntity> rt=index(requirements.findAllById(rs.values().stream().map(CentralSubprocessRequirementScopeEntity::getRequirementId).toList()),CentralRegulationRequirementEntity::getId); Map<UUID,CentralControlEntity> ct=index(controls.findAllById(cs.values().stream().map(CentralSubprocessControlScopeEntity::getControlId).toList()),CentralControlEntity::getId); return rows.stream().map(r->mapper.toResponse(r,required(sp,r.getSubprocessId()),required(rs,r.getRequirementScopeId()),required(rt,required(rs,r.getRequirementScopeId()).getRequirementId()),required(cs,r.getControlScopeId()),required(ct,required(cs,r.getControlScopeId()).getControlId()))).filter(r->matches(r,search)).sorted(Comparator.comparing(CentralSubprocessRequirementControlCoverageResponse::requirementCode).thenComparing(CentralSubprocessRequirementControlCoverageResponse::controlCode).thenComparing(CentralSubprocessRequirementControlCoverageResponse::id)).toList(); }
  private CentralSubprocessRequirementControlCoverageResponse mapOne(CentralSubprocessRequirementControlCoverageEntity row){ CentralSubprocessRequirementScopeEntity rs=requirementScopes.findById(row.getRequirementScopeId()).orElseThrow(()->notFound(row.getId())); CentralSubprocessControlScopeEntity cs=controlScopes.findById(row.getControlScopeId()).orElseThrow(()->notFound(row.getId())); return mapper.toResponse(row,requireSubprocess(row.getSubprocessId()),requirements.findById(rs.getRequirementId()).map(x->rs).orElseThrow(()->notFound(row.getId())),requirements.findById(rs.getRequirementId()).orElseThrow(()->notFound(row.getId())),cs,controls.findById(cs.getControlId()).orElseThrow(()->notFound(row.getId()))); }
  private boolean matches(CentralSubprocessRequirementControlCoverageResponse r,String search){if(search==null||search.isBlank())return true;String n=search.trim().toLowerCase(Locale.ROOT);return r.requirementCode().toLowerCase(Locale.ROOT).contains(n)||r.requirementTitle().toLowerCase(Locale.ROOT).contains(n)||r.controlCode().toLowerCase(Locale.ROOT).contains(n)||r.controlTitle().toLowerCase(Locale.ROOT).contains(n)||r.subprocessCode().toLowerCase(Locale.ROOT).contains(n)||r.subprocessTitle().toLowerCase(Locale.ROOT).contains(n);}
  private void validateNormalStatus(MasterDataLifecycleStatus status){if(status==DELETED)throw new UnprocessableEntityException("INVALID_LIFECYCLE_FILTER","error.masterdata.v2.invalidLifecycleFilter","Deleted Coverage rows require the deleted endpoint");}
  private CentralSubprocessEntity requireSubprocess(UUID id){return subprocesses.findById(id).orElseThrow(()->new NotFoundException("CENTRAL_SUBPROCESS_NOT_FOUND","error.masterdata.process.subprocess.notFound","Central Subprocess not found",id));}
  private NotFoundException notFound(UUID id){return new NotFoundException("REQUIREMENT_CONTROL_COVERAGE_NOT_FOUND","error.masterdata.requirementControlCoverage.notFound","Requirement-Control Coverage not found",id);}
  private static <T> Map<UUID,T> index(Iterable<T> values,Function<T,UUID> key){java.util.ArrayList<T> list=new java.util.ArrayList<>();values.forEach(list::add);return list.stream().collect(Collectors.toMap(key,Function.identity()));}
  private static <T> T required(Map<UUID,T> map,UUID id){T value=map.get(id);if(value==null)throw new IllegalStateException("Coverage endpoint missing: "+id);return value;}
}


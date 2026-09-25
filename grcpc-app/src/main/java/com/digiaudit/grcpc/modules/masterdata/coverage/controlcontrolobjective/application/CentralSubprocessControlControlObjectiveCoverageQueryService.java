package com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.api.dto.CentralControlControlObjectiveCoverageOptionsResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.api.dto.CentralSubprocessControlControlObjectiveCoverageResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.api.mapper.CentralSubprocessControlControlObjectiveCoverageMapper;
import com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.domain.entity.CentralSubprocessControlControlObjectiveCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.domain.repository.CentralSubprocessControlControlObjectiveCoverageRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.application.CentralSubprocessControlObjectiveScopeQueryService;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.entity.CentralSubprocessControlObjectiveScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.repository.CentralSubprocessControlObjectiveScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.control.application.CentralSubprocessControlScopeQueryService;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository.CentralSubprocessControlScopeRepository;
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
public class CentralSubprocessControlControlObjectiveCoverageQueryService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralSubprocessControlControlObjectiveCoverageRepository coverages;
  private final CentralSubprocessRepository subprocesses;
  private final CentralSubprocessControlScopeRepository controlScopes;
  private final CentralSubprocessControlObjectiveScopeRepository objectiveScopes;
  private final CentralControlRepository controls;
  private final CentralControlObjectiveRepository objectives;
  private final CentralSubprocessControlScopeQueryService controlScopeQueries;
  private final CentralSubprocessControlObjectiveScopeQueryService objectiveScopeQueries;
  private final CentralSubprocessControlControlObjectiveCoverageMapper mapper;

  public CentralSubprocessControlControlObjectiveCoverageQueryService(CentralSubprocessControlControlObjectiveCoverageRepository coverages, CentralSubprocessRepository subprocesses, CentralSubprocessControlScopeRepository controlScopes, CentralSubprocessControlObjectiveScopeRepository objectiveScopes, CentralControlRepository controls, CentralControlObjectiveRepository objectives, CentralSubprocessControlScopeQueryService controlScopeQueries, CentralSubprocessControlObjectiveScopeQueryService objectiveScopeQueries, CentralSubprocessControlControlObjectiveCoverageMapper mapper) {
    this.coverages=coverages; this.subprocesses=subprocesses; this.controlScopes=controlScopes; this.objectiveScopes=objectiveScopes; this.controls=controls; this.objectives=objectives; this.controlScopeQueries=controlScopeQueries; this.objectiveScopeQueries=objectiveScopeQueries; this.mapper=mapper;
  }

  @Transactional(readOnly=true) public List<CentralSubprocessControlControlObjectiveCoverageResponse> listForSubprocess(UUID subprocessId, MasterDataLifecycleStatus status, String search) { validateNormalStatus(status); requireSubprocess(subprocessId); return map(status==null?coverages.findBySubprocessIdAndStatusNot(subprocessId,DELETED):coverages.findBySubprocessIdAndStatus(subprocessId,status),search); }
  @Transactional(readOnly=true) public List<CentralSubprocessControlControlObjectiveCoverageResponse> deleted(UUID subprocessId, String search) { requireSubprocess(subprocessId); return map(coverages.findBySubprocessIdAndStatus(subprocessId,DELETED),search); }
  @Transactional(readOnly=true) public CentralSubprocessControlControlObjectiveCoverageResponse detail(UUID subprocessId, UUID coverageId) { CentralSubprocessControlControlObjectiveCoverageEntity row=coverages.findById(coverageId).orElseThrow(()->notFound(coverageId)); if(!row.getSubprocessId().equals(subprocessId)||row.getStatus()==DELETED)throw notFound(coverageId); return mapOne(row); }
  @Transactional(readOnly=true) public CentralControlControlObjectiveCoverageOptionsResponse options(UUID subprocessId) { requireSubprocess(subprocessId); return new CentralControlControlObjectiveCoverageOptionsResponse(controlScopeQueries.listForSubprocess(subprocessId,null,null),objectiveScopeQueries.listForSubprocess(subprocessId,null,null)); }
  @Transactional(readOnly=true) public List<CentralSubprocessControlControlObjectiveCoverageResponse> listForControlObjective(UUID controlId,String search){ List<UUID> ids=objectiveScopes.findByControlObjectiveIdAndStatusNot(controlId,DELETED).stream().map(CentralSubprocessControlObjectiveScopeEntity::getId).toList(); return ids.isEmpty()?List.of():map(coverages.findByControlObjectiveScopeIdInAndStatusNot(ids,DELETED),search); }
  @Transactional(readOnly=true) public List<CentralSubprocessControlControlObjectiveCoverageResponse> listForControl(UUID controlId,String search){ List<UUID> ids=controlScopes.findByControlIdAndStatusNot(controlId,DELETED).stream().map(CentralSubprocessControlScopeEntity::getId).toList(); return ids.isEmpty()?List.of():map(coverages.findByControlScopeIdInAndStatusNot(ids,DELETED),search); }

  private List<CentralSubprocessControlControlObjectiveCoverageResponse> map(List<CentralSubprocessControlControlObjectiveCoverageEntity> rows,String search){ if(rows.isEmpty())return List.of(); Map<UUID,CentralSubprocessEntity> sp=index(subprocesses.findAllById(rows.stream().map(CentralSubprocessControlControlObjectiveCoverageEntity::getSubprocessId).toList()),CentralSubprocessEntity::getId); Map<UUID,CentralSubprocessControlScopeEntity> rs=index(controlScopes.findAllById(rows.stream().map(CentralSubprocessControlControlObjectiveCoverageEntity::getControlScopeId).toList()),CentralSubprocessControlScopeEntity::getId); Map<UUID,CentralSubprocessControlObjectiveScopeEntity> cs=index(objectiveScopes.findAllById(rows.stream().map(CentralSubprocessControlControlObjectiveCoverageEntity::getControlObjectiveScopeId).toList()),CentralSubprocessControlObjectiveScopeEntity::getId); Map<UUID,CentralControlEntity> rt=index(controls.findAllById(rs.values().stream().map(CentralSubprocessControlScopeEntity::getControlId).toList()),CentralControlEntity::getId); Map<UUID,CentralControlObjectiveEntity> ct=index(objectives.findAllById(cs.values().stream().map(CentralSubprocessControlObjectiveScopeEntity::getControlObjectiveId).toList()),CentralControlObjectiveEntity::getId); return rows.stream().map(r->mapper.toResponse(r,required(sp,r.getSubprocessId()),required(rs,r.getControlScopeId()),required(rt,required(rs,r.getControlScopeId()).getControlId()),required(cs,r.getControlObjectiveScopeId()),required(ct,required(cs,r.getControlObjectiveScopeId()).getControlObjectiveId()))).filter(r->matches(r,search)).sorted(Comparator.comparing(CentralSubprocessControlControlObjectiveCoverageResponse::controlCode).thenComparing(CentralSubprocessControlControlObjectiveCoverageResponse::controlObjectiveCode).thenComparing(CentralSubprocessControlControlObjectiveCoverageResponse::id)).toList(); }
  private CentralSubprocessControlControlObjectiveCoverageResponse mapOne(CentralSubprocessControlControlObjectiveCoverageEntity row){ CentralSubprocessControlScopeEntity rs=controlScopes.findById(row.getControlScopeId()).orElseThrow(()->notFound(row.getId())); CentralSubprocessControlObjectiveScopeEntity cs=objectiveScopes.findById(row.getControlObjectiveScopeId()).orElseThrow(()->notFound(row.getId())); return mapper.toResponse(row,requireSubprocess(row.getSubprocessId()),controls.findById(rs.getControlId()).map(x->rs).orElseThrow(()->notFound(row.getId())),controls.findById(rs.getControlId()).orElseThrow(()->notFound(row.getId())),cs,objectives.findById(cs.getControlObjectiveId()).orElseThrow(()->notFound(row.getId()))); }
  private boolean matches(CentralSubprocessControlControlObjectiveCoverageResponse r,String search){if(search==null||search.isBlank())return true;String n=search.trim().toLowerCase(Locale.ROOT);return r.controlCode().toLowerCase(Locale.ROOT).contains(n)||r.controlTitle().toLowerCase(Locale.ROOT).contains(n)||r.controlObjectiveCode().toLowerCase(Locale.ROOT).contains(n)||r.controlObjectiveTitle().toLowerCase(Locale.ROOT).contains(n)||r.subprocessCode().toLowerCase(Locale.ROOT).contains(n)||r.subprocessTitle().toLowerCase(Locale.ROOT).contains(n);}
  private void validateNormalStatus(MasterDataLifecycleStatus status){if(status==DELETED)throw new UnprocessableEntityException("INVALID_LIFECYCLE_FILTER","error.masterdata.v2.invalidLifecycleFilter","Deleted Coverage rows require the deleted endpoint");}
  private CentralSubprocessEntity requireSubprocess(UUID id){return subprocesses.findById(id).orElseThrow(()->new NotFoundException("CENTRAL_SUBPROCESS_NOT_FOUND","error.masterdata.process.subprocess.notFound","Central Subprocess not found",id));}
  private NotFoundException notFound(UUID id){return new NotFoundException("CONTROL_CONTROL_OBJECTIVE_COVERAGE_NOT_FOUND","error.masterdata.controlControlObjectiveCoverage.notFound","Control-Control Objective Coverage not found",id);}
  private static <T> Map<UUID,T> index(Iterable<T> values,Function<T,UUID> key){java.util.ArrayList<T> list=new java.util.ArrayList<>();values.forEach(list::add);return list.stream().collect(Collectors.toMap(key,Function.identity()));}
  private static <T> T required(Map<UUID,T> map,UUID id){T value=map.get(id);if(value==null)throw new IllegalStateException("Coverage endpoint missing: "+id);return value;}
}



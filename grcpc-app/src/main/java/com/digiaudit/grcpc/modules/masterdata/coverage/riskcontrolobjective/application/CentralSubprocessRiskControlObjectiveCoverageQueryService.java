package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.api.dto.CentralRiskControlObjectiveCoverageOptionsResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.api.dto.CentralSubprocessRiskControlObjectiveCoverageResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.api.mapper.CentralSubprocessRiskControlObjectiveCoverageMapper;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.domain.entity.CentralSubprocessRiskControlObjectiveCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.domain.repository.CentralSubprocessRiskControlObjectiveCoverageRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.application.CentralSubprocessControlObjectiveScopeQueryService;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.entity.CentralSubprocessControlObjectiveScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.repository.CentralSubprocessControlObjectiveScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.application.CentralSubprocessRiskScopeQueryService;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.entity.CentralSubprocessRiskScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.repository.CentralSubprocessRiskScopeRepository;
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
public class CentralSubprocessRiskControlObjectiveCoverageQueryService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralSubprocessRiskControlObjectiveCoverageRepository coverages;
  private final CentralSubprocessRepository subprocesses;
  private final CentralSubprocessRiskScopeRepository riskScopes;
  private final CentralSubprocessControlObjectiveScopeRepository objectiveScopes;
  private final CentralRiskTemplateRepository risks;
  private final CentralControlObjectiveRepository objectives;
  private final CentralSubprocessRiskScopeQueryService riskScopeQueries;
  private final CentralSubprocessControlObjectiveScopeQueryService objectiveScopeQueries;
  private final CentralSubprocessRiskControlObjectiveCoverageMapper mapper;

  public CentralSubprocessRiskControlObjectiveCoverageQueryService(CentralSubprocessRiskControlObjectiveCoverageRepository coverages, CentralSubprocessRepository subprocesses, CentralSubprocessRiskScopeRepository riskScopes, CentralSubprocessControlObjectiveScopeRepository objectiveScopes, CentralRiskTemplateRepository risks, CentralControlObjectiveRepository objectives, CentralSubprocessRiskScopeQueryService riskScopeQueries, CentralSubprocessControlObjectiveScopeQueryService objectiveScopeQueries, CentralSubprocessRiskControlObjectiveCoverageMapper mapper) {
    this.coverages=coverages; this.subprocesses=subprocesses; this.riskScopes=riskScopes; this.objectiveScopes=objectiveScopes; this.risks=risks; this.objectives=objectives; this.riskScopeQueries=riskScopeQueries; this.objectiveScopeQueries=objectiveScopeQueries; this.mapper=mapper;
  }

  @Transactional(readOnly=true) public List<CentralSubprocessRiskControlObjectiveCoverageResponse> listForSubprocess(UUID subprocessId, MasterDataLifecycleStatus status, String search) { validateNormalStatus(status); requireSubprocess(subprocessId); return map(status==null?coverages.findBySubprocessIdAndStatusNot(subprocessId,DELETED):coverages.findBySubprocessIdAndStatus(subprocessId,status),search); }
  @Transactional(readOnly=true) public List<CentralSubprocessRiskControlObjectiveCoverageResponse> deleted(UUID subprocessId, String search) { requireSubprocess(subprocessId); return map(coverages.findBySubprocessIdAndStatus(subprocessId,DELETED),search); }
  @Transactional(readOnly=true) public CentralSubprocessRiskControlObjectiveCoverageResponse detail(UUID subprocessId, UUID coverageId) { CentralSubprocessRiskControlObjectiveCoverageEntity row=coverages.findById(coverageId).orElseThrow(()->notFound(coverageId)); if(!row.getSubprocessId().equals(subprocessId)||row.getStatus()==DELETED)throw notFound(coverageId); return mapOne(row); }
  @Transactional(readOnly=true) public CentralRiskControlObjectiveCoverageOptionsResponse options(UUID subprocessId) { requireSubprocess(subprocessId); return new CentralRiskControlObjectiveCoverageOptionsResponse(riskScopeQueries.listForSubprocess(subprocessId,null,null),objectiveScopeQueries.listForSubprocess(subprocessId,null,null)); }
  @Transactional(readOnly=true) public List<CentralSubprocessRiskControlObjectiveCoverageResponse> listForControlObjective(UUID controlId,String search){ List<UUID> ids=objectiveScopes.findByControlObjectiveIdAndStatusNot(controlId,DELETED).stream().map(CentralSubprocessControlObjectiveScopeEntity::getId).toList(); return ids.isEmpty()?List.of():map(coverages.findByControlObjectiveScopeIdInAndStatusNot(ids,DELETED),search); }
  @Transactional(readOnly=true) public List<CentralSubprocessRiskControlObjectiveCoverageResponse> listForRisk(UUID riskTemplateId,String search){ List<UUID> ids=riskScopes.findByRiskTemplateIdAndStatusNot(riskTemplateId,DELETED).stream().map(CentralSubprocessRiskScopeEntity::getId).toList(); return ids.isEmpty()?List.of():map(coverages.findByRiskScopeIdInAndStatusNot(ids,DELETED),search); }

  private List<CentralSubprocessRiskControlObjectiveCoverageResponse> map(List<CentralSubprocessRiskControlObjectiveCoverageEntity> rows,String search){ if(rows.isEmpty())return List.of(); Map<UUID,CentralSubprocessEntity> sp=index(subprocesses.findAllById(rows.stream().map(CentralSubprocessRiskControlObjectiveCoverageEntity::getSubprocessId).toList()),CentralSubprocessEntity::getId); Map<UUID,CentralSubprocessRiskScopeEntity> rs=index(riskScopes.findAllById(rows.stream().map(CentralSubprocessRiskControlObjectiveCoverageEntity::getRiskScopeId).toList()),CentralSubprocessRiskScopeEntity::getId); Map<UUID,CentralSubprocessControlObjectiveScopeEntity> cs=index(objectiveScopes.findAllById(rows.stream().map(CentralSubprocessRiskControlObjectiveCoverageEntity::getControlObjectiveScopeId).toList()),CentralSubprocessControlObjectiveScopeEntity::getId); Map<UUID,CentralRiskTemplateEntity> rt=index(risks.findAllById(rs.values().stream().map(CentralSubprocessRiskScopeEntity::getRiskTemplateId).toList()),CentralRiskTemplateEntity::getId); Map<UUID,CentralControlObjectiveEntity> ct=index(objectives.findAllById(cs.values().stream().map(CentralSubprocessControlObjectiveScopeEntity::getControlObjectiveId).toList()),CentralControlObjectiveEntity::getId); return rows.stream().map(r->mapper.toResponse(r,required(sp,r.getSubprocessId()),required(rs,r.getRiskScopeId()),required(rt,required(rs,r.getRiskScopeId()).getRiskTemplateId()),required(cs,r.getControlObjectiveScopeId()),required(ct,required(cs,r.getControlObjectiveScopeId()).getControlObjectiveId()))).filter(r->matches(r,search)).sorted(Comparator.comparing(CentralSubprocessRiskControlObjectiveCoverageResponse::riskTemplateCode).thenComparing(CentralSubprocessRiskControlObjectiveCoverageResponse::controlObjectiveCode).thenComparing(CentralSubprocessRiskControlObjectiveCoverageResponse::id)).toList(); }
  private CentralSubprocessRiskControlObjectiveCoverageResponse mapOne(CentralSubprocessRiskControlObjectiveCoverageEntity row){ CentralSubprocessRiskScopeEntity rs=riskScopes.findById(row.getRiskScopeId()).orElseThrow(()->notFound(row.getId())); CentralSubprocessControlObjectiveScopeEntity cs=objectiveScopes.findById(row.getControlObjectiveScopeId()).orElseThrow(()->notFound(row.getId())); return mapper.toResponse(row,requireSubprocess(row.getSubprocessId()),risks.findById(rs.getRiskTemplateId()).map(x->rs).orElseThrow(()->notFound(row.getId())),risks.findById(rs.getRiskTemplateId()).orElseThrow(()->notFound(row.getId())),cs,objectives.findById(cs.getControlObjectiveId()).orElseThrow(()->notFound(row.getId()))); }
  private boolean matches(CentralSubprocessRiskControlObjectiveCoverageResponse r,String search){if(search==null||search.isBlank())return true;String n=search.trim().toLowerCase(Locale.ROOT);return r.riskTemplateCode().toLowerCase(Locale.ROOT).contains(n)||r.riskTemplateTitle().toLowerCase(Locale.ROOT).contains(n)||r.controlObjectiveCode().toLowerCase(Locale.ROOT).contains(n)||r.controlObjectiveTitle().toLowerCase(Locale.ROOT).contains(n)||r.subprocessCode().toLowerCase(Locale.ROOT).contains(n)||r.subprocessTitle().toLowerCase(Locale.ROOT).contains(n);}
  private void validateNormalStatus(MasterDataLifecycleStatus status){if(status==DELETED)throw new UnprocessableEntityException("INVALID_LIFECYCLE_FILTER","error.masterdata.v2.invalidLifecycleFilter","Deleted Coverage rows require the deleted endpoint");}
  private CentralSubprocessEntity requireSubprocess(UUID id){return subprocesses.findById(id).orElseThrow(()->new NotFoundException("CENTRAL_SUBPROCESS_NOT_FOUND","error.masterdata.process.subprocess.notFound","Central Subprocess not found",id));}
  private NotFoundException notFound(UUID id){return new NotFoundException("RISK_CONTROL_OBJECTIVE_COVERAGE_NOT_FOUND","error.masterdata.riskControlObjectiveCoverage.notFound","Risk-Control Objective Coverage not found",id);}
  private static <T> Map<UUID,T> index(Iterable<T> values,Function<T,UUID> key){java.util.ArrayList<T> list=new java.util.ArrayList<>();values.forEach(list::add);return list.stream().collect(Collectors.toMap(key,Function.identity()));}
  private static <T> T required(Map<UUID,T> map,UUID id){T value=map.get(id);if(value==null)throw new IllegalStateException("Coverage endpoint missing: "+id);return value;}
}


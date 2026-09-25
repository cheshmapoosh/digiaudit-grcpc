package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.dto.CentralRiskControlCoverageOptionsResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.dto.CentralSubprocessRiskControlCoverageResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.mapper.CentralSubprocessRiskControlCoverageMapper;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.domain.entity.CentralSubprocessRiskControlCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.domain.repository.CentralSubprocessRiskControlCoverageRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.control.application.CentralSubprocessControlScopeQueryService;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository.CentralSubprocessControlScopeRepository;
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
public class CentralSubprocessRiskControlCoverageQueryService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralSubprocessRiskControlCoverageRepository coverages;
  private final CentralSubprocessRepository subprocesses;
  private final CentralSubprocessRiskScopeRepository riskScopes;
  private final CentralSubprocessControlScopeRepository controlScopes;
  private final CentralRiskTemplateRepository risks;
  private final CentralControlRepository controls;
  private final CentralSubprocessRiskScopeQueryService riskScopeQueries;
  private final CentralSubprocessControlScopeQueryService controlScopeQueries;
  private final CentralSubprocessRiskControlCoverageMapper mapper;

  public CentralSubprocessRiskControlCoverageQueryService(CentralSubprocessRiskControlCoverageRepository coverages, CentralSubprocessRepository subprocesses, CentralSubprocessRiskScopeRepository riskScopes, CentralSubprocessControlScopeRepository controlScopes, CentralRiskTemplateRepository risks, CentralControlRepository controls, CentralSubprocessRiskScopeQueryService riskScopeQueries, CentralSubprocessControlScopeQueryService controlScopeQueries, CentralSubprocessRiskControlCoverageMapper mapper) {
    this.coverages=coverages; this.subprocesses=subprocesses; this.riskScopes=riskScopes; this.controlScopes=controlScopes; this.risks=risks; this.controls=controls; this.riskScopeQueries=riskScopeQueries; this.controlScopeQueries=controlScopeQueries; this.mapper=mapper;
  }

  @Transactional(readOnly=true) public List<CentralSubprocessRiskControlCoverageResponse> listForSubprocess(UUID subprocessId, MasterDataLifecycleStatus status, String search) { validateNormalStatus(status); requireSubprocess(subprocessId); return map(status==null?coverages.findBySubprocessIdAndStatusNot(subprocessId,DELETED):coverages.findBySubprocessIdAndStatus(subprocessId,status),search); }
  @Transactional(readOnly=true) public List<CentralSubprocessRiskControlCoverageResponse> deleted(UUID subprocessId, String search) { requireSubprocess(subprocessId); return map(coverages.findBySubprocessIdAndStatus(subprocessId,DELETED),search); }
  @Transactional(readOnly=true) public CentralSubprocessRiskControlCoverageResponse detail(UUID subprocessId, UUID coverageId) { CentralSubprocessRiskControlCoverageEntity row=coverages.findById(coverageId).orElseThrow(()->notFound(coverageId)); if(!row.getSubprocessId().equals(subprocessId)||row.getStatus()==DELETED)throw notFound(coverageId); return mapOne(row); }
  @Transactional(readOnly=true) public CentralRiskControlCoverageOptionsResponse options(UUID subprocessId) { requireSubprocess(subprocessId); return new CentralRiskControlCoverageOptionsResponse(riskScopeQueries.listForSubprocess(subprocessId,null,null),controlScopeQueries.listForSubprocess(subprocessId,null,null)); }
  @Transactional(readOnly=true) public List<CentralSubprocessRiskControlCoverageResponse> listForControl(UUID controlId,String search){ List<UUID> ids=controlScopes.findByControlIdAndStatusNot(controlId,DELETED).stream().map(CentralSubprocessControlScopeEntity::getId).toList(); return ids.isEmpty()?List.of():map(coverages.findByControlScopeIdInAndStatusNot(ids,DELETED),search); }
  @Transactional(readOnly=true) public List<CentralSubprocessRiskControlCoverageResponse> listForRisk(UUID riskTemplateId,String search){ List<UUID> ids=riskScopes.findByRiskTemplateIdAndStatusNot(riskTemplateId,DELETED).stream().map(CentralSubprocessRiskScopeEntity::getId).toList(); return ids.isEmpty()?List.of():map(coverages.findByRiskScopeIdInAndStatusNot(ids,DELETED),search); }

  private List<CentralSubprocessRiskControlCoverageResponse> map(List<CentralSubprocessRiskControlCoverageEntity> rows,String search){ if(rows.isEmpty())return List.of(); Map<UUID,CentralSubprocessEntity> sp=index(subprocesses.findAllById(rows.stream().map(CentralSubprocessRiskControlCoverageEntity::getSubprocessId).toList()),CentralSubprocessEntity::getId); Map<UUID,CentralSubprocessRiskScopeEntity> rs=index(riskScopes.findAllById(rows.stream().map(CentralSubprocessRiskControlCoverageEntity::getRiskScopeId).toList()),CentralSubprocessRiskScopeEntity::getId); Map<UUID,CentralSubprocessControlScopeEntity> cs=index(controlScopes.findAllById(rows.stream().map(CentralSubprocessRiskControlCoverageEntity::getControlScopeId).toList()),CentralSubprocessControlScopeEntity::getId); Map<UUID,CentralRiskTemplateEntity> rt=index(risks.findAllById(rs.values().stream().map(CentralSubprocessRiskScopeEntity::getRiskTemplateId).toList()),CentralRiskTemplateEntity::getId); Map<UUID,CentralControlEntity> ct=index(controls.findAllById(cs.values().stream().map(CentralSubprocessControlScopeEntity::getControlId).toList()),CentralControlEntity::getId); return rows.stream().map(r->mapper.toResponse(r,required(sp,r.getSubprocessId()),required(rs,r.getRiskScopeId()),required(rt,required(rs,r.getRiskScopeId()).getRiskTemplateId()),required(cs,r.getControlScopeId()),required(ct,required(cs,r.getControlScopeId()).getControlId()))).filter(r->matches(r,search)).sorted(Comparator.comparing(CentralSubprocessRiskControlCoverageResponse::riskTemplateCode).thenComparing(CentralSubprocessRiskControlCoverageResponse::controlCode).thenComparing(CentralSubprocessRiskControlCoverageResponse::id)).toList(); }
  private CentralSubprocessRiskControlCoverageResponse mapOne(CentralSubprocessRiskControlCoverageEntity row){ CentralSubprocessRiskScopeEntity rs=riskScopes.findById(row.getRiskScopeId()).orElseThrow(()->notFound(row.getId())); CentralSubprocessControlScopeEntity cs=controlScopes.findById(row.getControlScopeId()).orElseThrow(()->notFound(row.getId())); return mapper.toResponse(row,requireSubprocess(row.getSubprocessId()),risks.findById(rs.getRiskTemplateId()).map(x->rs).orElseThrow(()->notFound(row.getId())),risks.findById(rs.getRiskTemplateId()).orElseThrow(()->notFound(row.getId())),cs,controls.findById(cs.getControlId()).orElseThrow(()->notFound(row.getId()))); }
  private boolean matches(CentralSubprocessRiskControlCoverageResponse r,String search){if(search==null||search.isBlank())return true;String n=search.trim().toLowerCase(Locale.ROOT);return r.riskTemplateCode().toLowerCase(Locale.ROOT).contains(n)||r.riskTemplateTitle().toLowerCase(Locale.ROOT).contains(n)||r.controlCode().toLowerCase(Locale.ROOT).contains(n)||r.controlTitle().toLowerCase(Locale.ROOT).contains(n)||r.subprocessCode().toLowerCase(Locale.ROOT).contains(n)||r.subprocessTitle().toLowerCase(Locale.ROOT).contains(n);}
  private void validateNormalStatus(MasterDataLifecycleStatus status){if(status==DELETED)throw new UnprocessableEntityException("INVALID_LIFECYCLE_FILTER","error.masterdata.v2.invalidLifecycleFilter","Deleted Coverage rows require the deleted endpoint");}
  private CentralSubprocessEntity requireSubprocess(UUID id){return subprocesses.findById(id).orElseThrow(()->new NotFoundException("CENTRAL_SUBPROCESS_NOT_FOUND","error.masterdata.process.subprocess.notFound","Central Subprocess not found",id));}
  private NotFoundException notFound(UUID id){return new NotFoundException("RISK_CONTROL_COVERAGE_NOT_FOUND","error.masterdata.riskControlCoverage.notFound","Risk-Control Coverage not found",id);}
  private static <T> Map<UUID,T> index(Iterable<T> values,Function<T,UUID> key){java.util.ArrayList<T> list=new java.util.ArrayList<>();values.forEach(list::add);return list.stream().collect(Collectors.toMap(key,Function.identity()));}
  private static <T> T required(Map<UUID,T> map,UUID id){T value=map.get(id);if(value==null)throw new IllegalStateException("Coverage endpoint missing: "+id);return value;}
}

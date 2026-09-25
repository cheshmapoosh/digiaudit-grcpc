package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api;

import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.dto.CentralRiskControlCoverageOptionsResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.dto.CentralSubprocessRiskControlCoverageResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.application.CentralSubprocessRiskControlCoverageQueryService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List; import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping; import org.springframework.web.bind.annotation.PathVariable; import org.springframework.web.bind.annotation.RequestMapping; import org.springframework.web.bind.annotation.RequestParam; import org.springframework.web.bind.annotation.RestController;

@RestController @RequestMapping("/api/master-data/central")
public class CentralRiskControlCoverageQueryController {
  private final CentralSubprocessRiskControlCoverageQueryService queries;
  public CentralRiskControlCoverageQueryController(CentralSubprocessRiskControlCoverageQueryService queries){this.queries=queries;}
  @GetMapping("/subprocesses/{subprocessId}/risk-control-coverages") @PreAuthorize("@masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('RISK') and @masterDataAuthorization.canView('CONTROL')") public List<CentralSubprocessRiskControlCoverageResponse> list(@PathVariable UUID subprocessId,@RequestParam(required=false) MasterDataLifecycleStatus status,@RequestParam(required=false) String search){return queries.listForSubprocess(subprocessId,status,search);}
  @GetMapping("/subprocesses/{subprocessId}/risk-control-coverages/deleted") @PreAuthorize("@masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('RISK') and @masterDataAuthorization.canView('CONTROL')") public List<CentralSubprocessRiskControlCoverageResponse> deleted(@PathVariable UUID subprocessId,@RequestParam(required=false) String search){return queries.deleted(subprocessId,search);}
  @GetMapping("/subprocesses/{subprocessId}/risk-control-coverages/options") @PreAuthorize("@masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('RISK') and @masterDataAuthorization.canView('CONTROL')") public CentralRiskControlCoverageOptionsResponse options(@PathVariable UUID subprocessId){return queries.options(subprocessId);}
  @GetMapping("/subprocesses/{subprocessId}/risk-control-coverages/{coverageId}") @PreAuthorize("@masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('RISK') and @masterDataAuthorization.canView('CONTROL')") public CentralSubprocessRiskControlCoverageResponse detail(@PathVariable UUID subprocessId,@PathVariable UUID coverageId){return queries.detail(subprocessId,coverageId);}
  @GetMapping("/controls/{controlId}/risk-coverages") @PreAuthorize("@masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('RISK') and @masterDataAuthorization.canView('CONTROL')") public List<CentralSubprocessRiskControlCoverageResponse> forControl(@PathVariable UUID controlId,@RequestParam(required=false) String search){return queries.listForControl(controlId,search);}
  @GetMapping("/risk-templates/{riskTemplateId}/control-coverages") @PreAuthorize("@masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('RISK') and @masterDataAuthorization.canView('CONTROL')") public List<CentralSubprocessRiskControlCoverageResponse> forRisk(@PathVariable UUID riskTemplateId,@RequestParam(required=false) String search){return queries.listForRisk(riskTemplateId,search);}
}

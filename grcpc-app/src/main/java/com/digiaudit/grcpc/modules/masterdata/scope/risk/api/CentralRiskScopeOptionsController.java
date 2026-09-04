package com.digiaudit.grcpc.modules.masterdata.scope.risk.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.application.CentralRiskCategoryQueryService;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.application.CentralRiskTemplateQueryService;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralRiskScopeSelectionOptionsResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/master-data/central/risk-scope")
public class CentralRiskScopeOptionsController {
  private final CentralRiskTemplateQueryService riskTemplates;
  private final CentralRiskCategoryQueryService riskCategories;

  public CentralRiskScopeOptionsController(
      CentralRiskTemplateQueryService riskTemplates,
      CentralRiskCategoryQueryService riskCategories) {
    this.riskTemplates = riskTemplates;
    this.riskCategories = riskCategories;
  }

  @GetMapping("/options")
  @PreAuthorize("hasAuthority('CENTRAL_RISK_SCOPE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public CentralRiskScopeSelectionOptionsResponse options() {
    return new CentralRiskScopeSelectionOptionsResponse(
        riskTemplates.list(null), riskCategories.list());
  }
}

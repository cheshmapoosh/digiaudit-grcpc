package com.digiaudit.grcpc.modules.masterdata.control.api;

import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlAccountGroupLinkDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlDocumentDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlPerformancePlanDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlRegulationLinkDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlRequirementLinkDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlRiskLinkDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlStepDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.CreateControlDocumentRequest;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.CreateControlPerformancePlanRequest;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.CreateControlStepRequest;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.UpdateControlDocumentRequest;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.UpdateControlPerformancePlanRequest;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.UpdateControlStepRequest;
import com.digiaudit.grcpc.modules.masterdata.control.application.ControlAssignmentTabService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/control-assignments/{controlAssignmentId}")
public class ControlAssignmentTabController {

    private final ControlAssignmentTabService service;

    @GetMapping("/steps")
    public List<ControlStepDto> listSteps(@PathVariable UUID controlAssignmentId) {
        log.debug("REST request to list control steps. controlAssignmentId={}", controlAssignmentId);
        return service.listSteps(controlAssignmentId);
    }

    @PostMapping("/steps")
    @ResponseStatus(HttpStatus.CREATED)
    public ControlStepDto createStep(
            @PathVariable UUID controlAssignmentId,
            @Valid @RequestBody CreateControlStepRequest request,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to create control step. controlAssignmentId={}", controlAssignmentId);
        return service.createStep(controlAssignmentId, request, httpRequest);
    }

    @PutMapping("/steps/{stepId}")
    public ControlStepDto updateStep(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID stepId,
            @Valid @RequestBody UpdateControlStepRequest request,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to update control step. controlAssignmentId={}, stepId={}", controlAssignmentId, stepId);
        return service.updateStep(controlAssignmentId, stepId, request, httpRequest);
    }

    @DeleteMapping("/steps/{stepId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStep(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID stepId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to delete control step. controlAssignmentId={}, stepId={}", controlAssignmentId, stepId);
        service.deleteStep(controlAssignmentId, stepId, httpRequest);
    }

    @GetMapping("/regulations")
    public List<ControlRegulationLinkDto> listRegulations(@PathVariable UUID controlAssignmentId) {
        log.debug("REST request to list control regulation links. controlAssignmentId={}", controlAssignmentId);
        return service.listRegulations(controlAssignmentId);
    }

    @PostMapping("/regulations/{regulationId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ControlRegulationLinkDto linkRegulation(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID regulationId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to link regulation. controlAssignmentId={}, regulationId={}", controlAssignmentId, regulationId);
        return service.linkRegulation(controlAssignmentId, regulationId, httpRequest);
    }

    @DeleteMapping("/regulations/{linkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRegulationLink(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID linkId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to delete regulation link. controlAssignmentId={}, linkId={}", controlAssignmentId, linkId);
        service.deleteRegulationLink(controlAssignmentId, linkId, httpRequest);
    }

    @GetMapping("/requirements")
    public List<ControlRequirementLinkDto> listRequirements(@PathVariable UUID controlAssignmentId) {
        log.debug("REST request to list control requirement links. controlAssignmentId={}", controlAssignmentId);
        return service.listRequirements(controlAssignmentId);
    }

    @PostMapping("/requirements/{requirementId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ControlRequirementLinkDto linkRequirement(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID requirementId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to link requirement. controlAssignmentId={}, requirementId={}", controlAssignmentId, requirementId);
        return service.linkRequirement(controlAssignmentId, requirementId, httpRequest);
    }

    @DeleteMapping("/requirements/{linkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRequirementLink(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID linkId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to delete requirement link. controlAssignmentId={}, linkId={}", controlAssignmentId, linkId);
        service.deleteRequirementLink(controlAssignmentId, linkId, httpRequest);
    }

    @GetMapping("/risks")
    public List<ControlRiskLinkDto> listRisks(@PathVariable UUID controlAssignmentId) {
        log.debug("REST request to list control risk links. controlAssignmentId={}", controlAssignmentId);
        return service.listRisks(controlAssignmentId);
    }

    @PostMapping("/risks/{riskId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ControlRiskLinkDto linkRisk(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID riskId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to link risk. controlAssignmentId={}, riskId={}", controlAssignmentId, riskId);
        return service.linkRisk(controlAssignmentId, riskId, httpRequest);
    }

    @DeleteMapping("/risks/{linkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRiskLink(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID linkId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to delete risk link. controlAssignmentId={}, linkId={}", controlAssignmentId, linkId);
        service.deleteRiskLink(controlAssignmentId, linkId, httpRequest);
    }

    @GetMapping("/account-groups")
    public List<ControlAccountGroupLinkDto> listAccountGroups(@PathVariable UUID controlAssignmentId) {
        log.debug("REST request to list control account group links. controlAssignmentId={}", controlAssignmentId);
        return service.listAccountGroups(controlAssignmentId);
    }

    @PostMapping("/account-groups/{accountGroupId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ControlAccountGroupLinkDto linkAccountGroup(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID accountGroupId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to link account group. controlAssignmentId={}, accountGroupId={}", controlAssignmentId, accountGroupId);
        return service.linkAccountGroup(controlAssignmentId, accountGroupId, httpRequest);
    }

    @DeleteMapping("/account-groups/{linkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccountGroupLink(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID linkId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to delete account group link. controlAssignmentId={}, linkId={}", controlAssignmentId, linkId);
        service.deleteAccountGroupLink(controlAssignmentId, linkId, httpRequest);
    }

    @GetMapping("/documents")
    public List<ControlDocumentDto> listDocuments(@PathVariable UUID controlAssignmentId) {
        log.debug("REST request to list control documents. controlAssignmentId={}", controlAssignmentId);
        return service.listDocuments(controlAssignmentId);
    }

    @PostMapping("/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public ControlDocumentDto createDocument(
            @PathVariable UUID controlAssignmentId,
            @Valid @RequestBody CreateControlDocumentRequest request,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to create control document. controlAssignmentId={}", controlAssignmentId);
        return service.createDocument(controlAssignmentId, request, httpRequest);
    }

    @PutMapping("/documents/{documentId}")
    public ControlDocumentDto updateDocument(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID documentId,
            @Valid @RequestBody UpdateControlDocumentRequest request,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to update control document. controlAssignmentId={}, documentId={}", controlAssignmentId, documentId);
        return service.updateDocument(controlAssignmentId, documentId, request, httpRequest);
    }

    @DeleteMapping("/documents/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID documentId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to delete control document. controlAssignmentId={}, documentId={}", controlAssignmentId, documentId);
        service.deleteDocument(controlAssignmentId, documentId, httpRequest);
    }

    @GetMapping("/performance-plans")
    public List<ControlPerformancePlanDto> listPerformancePlans(@PathVariable UUID controlAssignmentId) {
        log.debug("REST request to list control performance plans. controlAssignmentId={}", controlAssignmentId);
        return service.listPerformancePlans(controlAssignmentId);
    }

    @PostMapping("/performance-plans")
    @ResponseStatus(HttpStatus.CREATED)
    public ControlPerformancePlanDto createPerformancePlan(
            @PathVariable UUID controlAssignmentId,
            @Valid @RequestBody CreateControlPerformancePlanRequest request,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to create control performance plan. controlAssignmentId={}", controlAssignmentId);
        return service.createPerformancePlan(controlAssignmentId, request, httpRequest);
    }

    @PutMapping("/performance-plans/{planId}")
    public ControlPerformancePlanDto updatePerformancePlan(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID planId,
            @Valid @RequestBody UpdateControlPerformancePlanRequest request,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to update control performance plan. controlAssignmentId={}, planId={}", controlAssignmentId, planId);
        return service.updatePerformancePlan(controlAssignmentId, planId, request, httpRequest);
    }

    @DeleteMapping("/performance-plans/{planId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePerformancePlan(
            @PathVariable UUID controlAssignmentId,
            @PathVariable UUID planId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to delete control performance plan. controlAssignmentId={}, planId={}", controlAssignmentId, planId);
        service.deletePerformancePlan(controlAssignmentId, planId, httpRequest);
    }
}

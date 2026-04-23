package com.digiaudit.grcpc.modules.regulation.api;

import com.digiaudit.grcpc.modules.regulation.api.dto.*;
import com.digiaudit.grcpc.modules.regulation.application.RegulationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/regulations")
@RequiredArgsConstructor
public class RegulationController {

    private final RegulationService regulationService;

    @GetMapping
    public List<RegulationResponse> findAll() {
        return regulationService.findAll();
    }

    @GetMapping("/roots")
    public List<RegulationResponse> findRoots() {
        return regulationService.findRoots();
    }

    @GetMapping("/{id}")
    public RegulationResponse findById(@PathVariable UUID id) {
        return regulationService.findById(id);
    }

    @GetMapping("/{id}/children")
    public List<RegulationResponse> findChildren(@PathVariable UUID id) {
        return regulationService.findChildren(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RegulationResponse create(@Valid @RequestBody CreateRegulationRequest request) {
        return regulationService.create(request);
    }

    @PutMapping("/{id}")
    public RegulationResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateRegulationRequest request) {
        return regulationService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public RegulationResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateRegulationStatusRequest request) {
        return regulationService.updateStatus(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        regulationService.delete(id);
    }
}

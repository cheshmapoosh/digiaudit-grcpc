package com.digiaudit.grcpc.modules.masterdata.ordering.api;

import com.digiaudit.grcpc.modules.masterdata.ordering.application.CatalogOrderService;
import com.digiaudit.grcpc.modules.masterdata.ordering.domain.CatalogDisplayOrder;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/master-data/display-order") @RequiredArgsConstructor
public class CatalogOrderController {
    private final CatalogOrderService service;
    @GetMapping("/{catalog}") @PreAuthorize("@masterDataAuthorization.canViewAny()")
    public List<CatalogOrderRow> view(@PathVariable CatalogDisplayOrder catalog) { return service.view(catalog); }
    @PostMapping("/{catalog}") @PreAuthorize("@masterDataAuthorization.canManageAny()")
    public List<CatalogOrderRow> reorder(@PathVariable CatalogDisplayOrder catalog, @Valid @RequestBody CatalogOrderRequest request) {
        return service.reorder(catalog, request);
    }
}

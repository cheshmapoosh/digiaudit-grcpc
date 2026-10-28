package com.digiaudit.grcpc.modules.masterdata.ordering.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.ordering.api.*;
import com.digiaudit.grcpc.modules.masterdata.ordering.domain.CatalogDisplayOrder;
import com.digiaudit.grcpc.modules.masterdata.ordering.infrastructure.CatalogOrderRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class CatalogOrderService {
    private final CatalogOrderRepository repository;
    private final MasterDataAuthorizationService authorization;
    private final MasterDataRevisionCoordinator coordinator;
    private final RevisionMutationGuard mutationGuard;
    private final CurrentUserProvider currentUser;
    private final ObjectMapper json;

    private static final Comparator<CatalogOrderRow> ORDER = Comparator
        .comparing((CatalogOrderRow row) -> row.displayOrder() != null)
        .thenComparing(CatalogOrderRow::displayOrder, Comparator.nullsFirst(Comparator.naturalOrder()))
        .thenComparing(CatalogOrderRow::createdAt, Comparator.reverseOrder())
        .thenComparing(row -> row.entityType().name()).thenComparing(CatalogOrderRow::id);

    @Transactional(readOnly = true)
    public List<CatalogOrderRow> view(CatalogDisplayOrder catalog) {
        if (!authorization.canView(catalog.area())) throw new ForbiddenException("Catalog access denied");
        return repository.rows(catalog).stream().sorted(ORDER).toList();
    }

    public List<CatalogOrderRow> reorder(CatalogDisplayOrder catalog, CatalogOrderRequest request) {
        List<CatalogOrderRow> confirmed = new ArrayList<>();
        coordinator.executeStructural(catalog.guard(), RevisionRequest.central("Reorder " + catalog.name(), "Main catalog display order", null), context -> {
            mutationGuard.requireHierarchyGuard(context, catalog.guard());
            // This live check executes after ADMINISTRATION and hierarchy locks, before any source read.
            if (!authorization.canManage(catalog.area())) throw new ForbiddenException("Catalog management denied");
            var rows = repository.rows(catalog);
            var source = rows.stream().filter(row -> row.key().equals(request.source())).findFirst().orElseThrow(CatalogOrderService::invalid);
            var destination = rows.stream().filter(row -> row.key().equals(request.destination())).findFirst().orElseThrow(CatalogOrderService::invalid);
            if (source.key().equals(destination.key()) || !Objects.equals(source.parentId(), destination.parentId())
                    || source.parentType() != destination.parentType()) throw invalid();
            var siblings = rows.stream().filter(row -> Objects.equals(row.parentId(), source.parentId()) && row.parentType() == source.parentType())
                .sorted(ORDER).toList();
            var expected = siblings.stream().map(row -> new CatalogOrderRequest.Sibling(row.entityType(), row.id(), row.version())).toList();
            if (!expected.equals(request.siblings())) throw new ConflictException("CATALOG_ORDER_STALE", "catalog.order.stale", "Catalog siblings changed; refresh before reordering");
            var ordered = new ArrayList<>(siblings);
            ordered.remove(source);
            ordered.add(ordered.indexOf(destination) + (request.placement() == CatalogOrderRequest.Placement.AFTER ? 1 : 0), source);
            if (ordered.equals(siblings)) throw invalid();
            List<RevisionContentResult> contents = new ArrayList<>();
            Map<CatalogOrderRequest.Key, CatalogOrderRow> after = new HashMap<>();
            // Stable table/id order; only affected siblings are written. The hierarchy Guard is authoritative.
            for (var before : siblings.stream().sorted(Comparator.comparing((CatalogOrderRow row) -> row.entityType().name()).thenComparing(CatalogOrderRow::id)).toList()) {
                long rank = ordered.indexOf(before);
                if (Objects.equals(before.displayOrder(), rank)) { after.put(before.key(), before); continue; }
                repository.update(catalog, before, rank, currentUser.getCurrentPrincipal().getUserId());
                var updated = new CatalogOrderRow(before.entityType(), before.id(), before.parentType(), before.parentId(), rank, before.version() + 1, before.createdAt());
                after.put(before.key(), updated);
                contents.add(RevisionContentResult.completed(before.entityType(), before.id(), RevisionOperationType.UPDATE, before.version(),
                    json.valueToTree(before), json.valueToTree(updated), updated.version(), json.valueToTree(Map.of("command", "DISPLAY_ORDER", "sameParent", true))));
            }
            var primary = after.get(source.key());
            // A node can keep its numeric rank when previously unranked siblings move around it.
            var primaryContent = contents.stream().filter(content -> content.entityType() == source.entityType() && content.entityId().equals(source.id())).findFirst();
            if (primaryContent.isEmpty()) {
                repository.update(catalog, source, primary.displayOrder(), currentUser.getCurrentPrincipal().getUserId());
                primary = new CatalogOrderRow(source.entityType(), source.id(), source.parentType(), source.parentId(), primary.displayOrder(), source.version() + 1, source.createdAt());
                after.put(source.key(), primary);
                contents.add(RevisionContentResult.completed(source.entityType(), source.id(), RevisionOperationType.UPDATE, source.version(),
                    json.valueToTree(source), json.valueToTree(primary), primary.version(), json.valueToTree(Map.of("command", "DISPLAY_ORDER", "sameParent", true))));
            }
            var primaryKey = source.key();
            contents.sort(Comparator.comparing((RevisionContentResult content) -> !content.entityId().equals(primaryKey.id()))
                .thenComparing(content -> content.entityType().name()).thenComparing(RevisionContentResult::entityId));
            rows.forEach(row -> confirmed.add(after.getOrDefault(row.key(), row)));
            return RevisionOperationResult.completed(context, new MasterDataMutationResult(primary.id(), context.revisionId(), primary.version()), contents);
        });
        return confirmed.stream().sorted(ORDER).toList();
    }
    private static UnprocessableEntityException invalid() {
        return new UnprocessableEntityException("CATALOG_ORDER_INVALID", "catalog.order.invalid", "Only distinct siblings may be reordered");
    }
}

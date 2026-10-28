package com.digiaudit.grcpc.modules.masterdata.ordering.infrastructure;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.security.ProfileContext;
import com.digiaudit.grcpc.modules.datasetprofile.application.ProfileTransactionPolicy;
import com.digiaudit.grcpc.modules.masterdata.ordering.api.CatalogOrderRow;
import com.digiaudit.grcpc.modules.masterdata.ordering.domain.CatalogDisplayOrder;
import java.nio.ByteBuffer;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository @RequiredArgsConstructor
public class CatalogOrderRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private static UUID uuid(byte[] raw) {
        if (raw == null) return null;
        var buffer = ByteBuffer.wrap(raw); return new UUID(buffer.getLong(), buffer.getLong());
    }
    public List<CatalogOrderRow> rows(CatalogDisplayOrder catalog) {
        List<CatalogOrderRow> result = new ArrayList<>();
        for (var node : catalog.nodes()) {
            result.addAll(jdbc.query("select id, " + node.parentColumn() + " parent_id, display_order, version, created_at from "
                + node.table() + " where profile_id = :profile and status <> 'DELETED'",
                Map.of("profile", ProfileContext.raw(ProfileContext.requireId())), (rs, index) -> {
                    UUID parent = uuid(rs.getBytes("parent_id"));
                    Number rank = (Number) rs.getObject("display_order");
                    return new CatalogOrderRow(node.type(), uuid(rs.getBytes("id")), parent == null ? null : node.parentType(), parent,
                        rank == null ? null : rank.longValue(), rs.getLong("version"), rs.getTimestamp("created_at").toInstant());
                }));
        }
        return List.copyOf(result);
    }
    public void update(CatalogDisplayOrder catalog, CatalogOrderRow row, long rank, UUID actor) {
        ProfileTransactionPolicy.requireProtectedMutation();
        var node = catalog.nodes().stream().filter(value -> value.type() == row.entityType()).findFirst().orElseThrow();
        int updated = jdbc.update("update " + node.table()
            + " set display_order = :rank, version = version + 1, updated_at = systimestamp, updated_by = :actor"
            + " where profile_id = :profile and id = :id and version = :version and status <> 'DELETED'",
            Map.of("rank", rank, "actor", ProfileContext.raw(actor), "profile", ProfileContext.raw(ProfileContext.requireId()),
                "id", ProfileContext.raw(row.id()), "version", row.version()));
        if (updated != 1) throw new ConflictException("CATALOG_ORDER_STALE", "catalog.order.stale", "Catalog siblings changed; refresh before reordering");
    }
}

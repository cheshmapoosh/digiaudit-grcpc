package com.digiaudit.grcpc.modules.basicdata.infrastructure;

import com.digiaudit.grcpc.common.security.ProfileContext;
import com.digiaudit.grcpc.modules.basicdata.domain.*;
import java.nio.ByteBuffer;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/** All dynamic identifiers come exclusively from the closed two-kind enum. */
@Repository @RequiredArgsConstructor
public class JdbcBasicDataRepository implements BasicDataRepository {
    private final JdbcTemplate jdbc;
    private static UUID uuid(byte[] value) {
        var buffer = ByteBuffer.wrap(value); return new UUID(buffer.getLong(), buffer.getLong());
    }
    private static final RowMapper<BasicDataType> MAPPER = (rs, row) -> new BasicDataType(
            uuid(rs.getBytes("id")), uuid(rs.getBytes("profile_id")), rs.getString("profile_name"),
            rs.getString("name"), rs.getString("description"), rs.getString("status"), rs.getLong("version"));
    private String select(BasicDataKind kind) {
        return "select t.id, t.profile_id, p.name profile_name, t.name, t.description, t.status, t.version from "
                + kind.table + " t join dataset_profile p on p.id = t.profile_id where t.profile_id = ?";
    }
    public List<BasicDataType> list(BasicDataKind kind, UUID profileId) {
        return jdbc.query(select(kind) + " order by t.name, t.id", MAPPER, ProfileContext.raw(profileId));
    }
    public Optional<BasicDataType> find(BasicDataKind kind, UUID profileId, UUID id) {
        return jdbc.query(select(kind) + " and t.id = ?", MAPPER, ProfileContext.raw(profileId), ProfileContext.raw(id)).stream().findFirst();
    }
    public Optional<UUID> legacyOrganizationType(UUID profileId, String code) {
        return jdbc.query("select id from basic_organization_type where profile_id = ? and legacy_code = ? and status <> 'DELETED'",
                (rs, n) -> uuid(rs.getBytes(1)), ProfileContext.raw(profileId), code).stream().findFirst();
    }
    public boolean nameExists(BasicDataKind kind, UUID profileId, String name, UUID excludingId) {
        return jdbc.queryForObject("select count(*) from " + kind.table + " where profile_id = ? and status <> 'DELETED' and lower(name) = lower(?) and id <> ?",
                Long.class, ProfileContext.raw(profileId), name, ProfileContext.raw(excludingId)) > 0;
    }
    public String legacyOrganizationCode(UUID profileId, UUID id) {
        return jdbc.queryForObject("select legacy_code from basic_organization_type where profile_id = ? and id = ?", String.class,
                ProfileContext.raw(profileId), ProfileContext.raw(id));
    }
    public boolean referenced(BasicDataKind kind, UUID profileId, UUID id) {
        return jdbc.queryForObject("select count(*) from " + kind.referenceTable + " where profile_id = ? and " + kind.referenceColumn + " = ?",
                Long.class, ProfileContext.raw(profileId), ProfileContext.raw(id)) > 0;
    }
    public void insert(BasicDataKind kind, UUID profileId, UUID id, String name, String description, UUID actor) {
        jdbc.update("insert into " + kind.table + " (id, profile_id, name, description, status, version, created_at, created_by, updated_at, updated_by) values (?, ?, ?, ?, 'ACTIVE', 0, systimestamp, ?, systimestamp, ?)",
                ProfileContext.raw(id), ProfileContext.raw(profileId), name, description, actor.toString(), actor.toString());
    }
    public boolean update(BasicDataKind kind, UUID profileId, UUID id, long version, String name, String description, String status, UUID actor) {
        return jdbc.update("update " + kind.table + " set name = ?, description = ?, status = ?, version = version + 1, updated_at = systimestamp, updated_by = ?, "
                        + "deleted_at = case when ? = 'DELETED' then systimestamp else null end, deleted_by = case when ? = 'DELETED' then ? else null end where profile_id = ? and id = ? and version = ?",
                name, description, status, actor.toString(), status, status, actor.toString(), ProfileContext.raw(profileId), ProfileContext.raw(id), version) == 1;
    }
}

package com.digiaudit.grcpc.modules.organization.infrastructure.persistence;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.security.ProfileContext;
import com.digiaudit.grcpc.modules.datasetprofile.application.ProfileTransactionPolicy;
import com.digiaudit.grcpc.modules.organization.domain.OrganizationOwnerAssignment;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationOwnerAssignmentRepository;
import java.nio.ByteBuffer;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository @RequiredArgsConstructor
public class JdbcOrganizationOwnerAssignmentRepository implements OrganizationOwnerAssignmentRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private static byte[] scope(UUID id) {
        if (!ProfileContext.requireId().equals(id)) com.digiaudit.grcpc.modules.datasetprofile.application.ProfileAccessService.deny();
        return ProfileContext.raw(id);
    }
    private static UUID uuid(byte[] value) {
        if (value == null) return null;
        var b = ByteBuffer.wrap(value); return new UUID(b.getLong(), b.getLong());
    }
    private static Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }
    private static final RowMapper<OrganizationOwnerAssignment> ROW = (rs, n) -> new OrganizationOwnerAssignment(
        uuid(rs.getBytes("id")), uuid(rs.getBytes("profile_id")), uuid(rs.getBytes("organization_id")), UUID.fromString(rs.getString("user_id")),
        rs.getString("status"), rs.getLong("version"), instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("updated_at")),
        uuid(rs.getBytes("created_by")), uuid(rs.getBytes("updated_by")), instant(rs.getTimestamp("deleted_at")), uuid(rs.getBytes("deleted_by")));
    private static final String USERS = """
        select u.id, u.username, u.first_name, u.last_name,
          case when u.root_user = 1 then 'ROOT_ADMIN' when u.profile_admin = 1 then 'PROFILE_ADMIN'
          else (select min(r.code) from user_role_assignment a join role r on r.id = a.role_id
            where a.user_id = u.id and a.profile_id = :profile and a.active = 1
              and a.scope_type = 'GLOBAL' and a.scope_org_unit_id is null and r.enabled = 1
              and r.code in ('MASTER_DATA_ADMIN','ORGANIZATION_MASTER_DATA_MANAGER')
              and (a.valid_from is null or a.valid_from <= current_timestamp)
              and (a.valid_to is null or a.valid_to >= current_timestamp)) end role_code
        from app_user u where u.enabled = 1 and u.locked = 0 and (
          u.root_user = 1
          or (u.profile_admin = 1 and exists (select 1 from profile_admin_access p where p.user_id = u.id and p.profile_id = :profile)
              and exists (select 1 from role r where r.code = 'PROFILE_ADMIN' and r.enabled = 1))
          or (u.root_user = 0 and u.profile_admin = 0 and u.profile_id = :profile and exists (
            select 1 from user_role_assignment a join role r on r.id = a.role_id
            where a.user_id = u.id and a.profile_id = :profile and a.active = 1
              and a.scope_type = 'GLOBAL' and a.scope_org_unit_id is null and r.enabled = 1
              and r.code in ('MASTER_DATA_ADMIN','ORGANIZATION_MASTER_DATA_MANAGER')
              and (a.valid_from is null or a.valid_from <= current_timestamp)
              and (a.valid_to is null or a.valid_to >= current_timestamp))))
        order by u.first_name, u.last_name, u.id
        """;
    public List<OwnerOption> eligibleUsers(UUID profileId) {
        return jdbc.query(USERS, Map.of("profile", scope(profileId)), (rs, n) -> new OwnerOption(
            UUID.fromString(rs.getString("id")), (rs.getString("first_name") + " " + rs.getString("last_name")).trim(), rs.getString("username"), rs.getString("role_code")));
    }
    public OwnerOption userIdentity(UUID userId) {
        return jdbc.queryForObject("select id, username, first_name, last_name from app_user where id = :id", Map.of("id", userId.toString()),
            (rs, n) -> new OwnerOption(userId, (rs.getString("first_name") + " " + rs.getString("last_name")).trim(), rs.getString("username"), null));
    }
    public List<OrganizationOwnerAssignment> assignments(UUID profileId, UUID organizationId) {
        return jdbc.query("select * from organization_owner_assignment where profile_id = :profile and organization_id = :organization order by user_id",
            Map.of("profile", scope(profileId), "organization", ProfileContext.raw(organizationId)), ROW);
    }
    public Optional<OrganizationOwnerAssignment> lockAssignment(UUID profileId, UUID organizationId, UUID userId) {
        ProfileTransactionPolicy.requireProtectedMutation();
        return jdbc.query("select * from organization_owner_assignment where profile_id = :profile and organization_id = :organization and user_id = :user for update wait 5",
            Map.of("profile", scope(profileId), "organization", ProfileContext.raw(organizationId), "user", userId.toString()), ROW).stream().findFirst();
    }
    public List<OrganizationOwnerAssignment> activeForUser(UUID profileId, UUID userId) {
        return jdbc.query("select * from organization_owner_assignment where profile_id = :profile and user_id = :user and status = 'ACTIVE' order by organization_id",
            Map.of("profile", scope(profileId), "user", userId.toString()), ROW);
    }
    public OrganizationOwnerAssignment insert(UUID profileId, UUID organizationId, UUID userId, UUID actorId) {
        ProfileTransactionPolicy.requireProtectedMutation();
        UUID id = UUID.randomUUID();
        jdbc.update("insert into organization_owner_assignment (id, profile_id, organization_id, user_id, status, version, created_at, updated_at, created_by, updated_by) values (:id, :profile, :organization, :user, 'ACTIVE', 0, systimestamp, systimestamp, :actor, :actor)",
            Map.of("id", ProfileContext.raw(id), "profile", scope(profileId), "organization", ProfileContext.raw(organizationId), "user", userId.toString(), "actor", ProfileContext.raw(actorId)));
        return assignments(profileId, organizationId).stream().filter(row -> row.id().equals(id)).findFirst().orElseThrow();
    }
    public OrganizationOwnerAssignment changeStatus(OrganizationOwnerAssignment row, String status, UUID actorId) {
        ProfileTransactionPolicy.requireProtectedMutation();
        int updated = jdbc.update("update organization_owner_assignment set status = :status, version = version + 1, updated_at = systimestamp, updated_by = :actor, deleted_at = case when :status = 'DELETED' then systimestamp else null end, deleted_by = case when :status = 'DELETED' then :actor else null end where profile_id = :profile and id = :id and version = :version",
            Map.of("status", status, "actor", ProfileContext.raw(actorId), "profile", scope(row.profileId()), "id", ProfileContext.raw(row.id()), "version", row.version()));
        if (updated != 1) throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", "Organization owner assignment version conflict");
        return assignments(row.profileId(), row.organizationId()).stream().filter(next -> next.id().equals(row.id())).findFirst().orElseThrow();
    }
}

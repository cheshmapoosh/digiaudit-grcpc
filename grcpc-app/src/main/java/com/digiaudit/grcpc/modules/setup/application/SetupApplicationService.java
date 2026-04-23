package com.digiaudit.grcpc.modules.setup.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.setup.api.dto.InitializeSystemRequest;
import com.digiaudit.grcpc.modules.setup.domain.entity.SystemSetupEntity;
import com.digiaudit.grcpc.modules.setup.domain.repository.SystemSetupRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.UserRoleAssignmentEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.RoleRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.UserRoleAssignmentRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SetupApplicationService {

    private static final String ROOT_ROLE_CODE = "ROOT_ADMIN";

    private final SystemSetupRepository systemSetupRepository;
    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final UserRoleAssignmentRepository userRoleAssignmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @Transactional
    public void initialize(InitializeSystemRequest request, HttpServletRequest httpServletRequest) {
        boolean alreadyInitialized = systemSetupRepository.findAll()
                .stream()
                .findFirst()
                .map(SystemSetupEntity::isInitialized)
                .orElse(false);

        if (alreadyInitialized || appUserRepository.existsByRootUserTrue()) {
            throw new ConflictException("System is already initialized");
        }

        String normalizedUsername = request.username().trim().toLowerCase(Locale.ROOT);
        if (appUserRepository.existsByUsername(normalizedUsername)) {
            throw new ConflictException("Username already exists");
        }

        RoleEntity rootRole = roleRepository.findByCode(ROOT_ROLE_CODE)
                .orElseThrow(() -> new NotFoundException("ROOT_ADMIN role seed was not found"));

        log.info("Initializing system and creating root user. username={}", normalizedUsername);
        AppUserEntity rootUser = appUserRepository.save(
                AppUserEntity.builder()
                        .username(normalizedUsername)
                        .passwordHash(passwordEncoder.encode(request.password()))
                        .firstName(request.firstName().trim())
                        .lastName(request.lastName().trim())
                        .mobile(request.mobile())
                        .email(request.email())
                        .enabled(true)
                        .locked(false)
                        .rootUser(true)
                        .build()
        );

        userRoleAssignmentRepository.save(
                UserRoleAssignmentEntity.builder()
                        .user(rootUser)
                        .role(rootRole)
                        .scopeType(ScopeType.GLOBAL)
                        .assignedAt(LocalDateTime.now())
                        .active(true)
                        .build()
        );

        SystemSetupEntity setupEntity = systemSetupRepository.findAll()
                .stream()
                .findFirst()
                .orElse(SystemSetupEntity.builder().initialized(false).build());

        setupEntity.setInitialized(true);
        setupEntity.setInitializedAt(Instant.now());
        setupEntity.setInitializedByUserId(rootUser.getId());
        systemSetupRepository.save(setupEntity);

        auditService.log(
                AuditEventType.ROOT_USER_CREATED,
                AuditTargetType.USER,
                rootUser.getId().toString(),
                ActionResult.SUCCESS,
                null,
                httpServletRequest,
                Map.of("username", rootUser.getUsername())
        );

        auditService.log(
                AuditEventType.SYSTEM_INITIALIZED,
                AuditTargetType.SYSTEM_SETUP,
                setupEntity.getId().toString(),
                ActionResult.SUCCESS,
                rootUser.getId(),
                httpServletRequest,
                Map.of("initializedBy", rootUser.getUsername())
        );
    }
}

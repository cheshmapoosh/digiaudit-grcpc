package com.digiaudit.grcpc.modules.auth.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.common.security.UsernamePolicy;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.auth.api.dto.ChangeUsernameRequest;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UsernameService {
    private final AppUserRepository users;
    private final CurrentUserProvider currentUserProvider;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    @Transactional
    public void changeUsername(ChangeUsernameRequest request, HttpServletRequest httpRequest) {
        var principal = currentUserProvider.getCurrentPrincipal();
        var user = users.findByIdForUpdate(principal.getUserId())
                .orElseThrow(() -> new NotFoundException("User was not found"));
        if (!user.isEnabled() || user.isLocked() || user.getCredentialVersion() != principal.getCredentialVersion()
                || !encoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ConflictException("CURRENT_PASSWORD_INVALID", "security.password.currentInvalid",
                    "Current password or session is invalid");
        }
        if (user.isPasswordChangeRequired()) {
            throw new ConflictException("PASSWORD_CHANGE_REQUIRED", "security.password.changeRequired",
                    "Change the temporary password before changing username");
        }
        String username = UsernamePolicy.normalize(request.newUsername());
        if (users.existsByUsername(username)) {
            throw usernameUnavailable();
        }
        String previousUsername = user.getUsername();
        user.setUsername(username);
        user.setCredentialVersion(user.getCredentialVersion() + 1);
        user.setUpdatedBy(user.getId());
        try {
            // The database unique constraint also handles simultaneous claims to the same name.
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw usernameUnavailable();
        }
        audit.log(AuditEventType.USER_UPDATED, AuditTargetType.USER, user.getId().toString(),
                ActionResult.SUCCESS, user.getId(), httpRequest,
                Map.of("operation", "USERNAME_CHANGED", "previousUsername", previousUsername, "username", username));
    }

    private ConflictException usernameUnavailable() {
        return new ConflictException("USERNAME_UNAVAILABLE", "security.username.unavailable",
                "Choose a different, unused username");
    }
}

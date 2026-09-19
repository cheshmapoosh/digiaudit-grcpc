package com.digiaudit.grcpc.modules.auth.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.common.security.PasswordPolicy;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.auth.api.dto.ChangePasswordRequest;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PasswordService {
    private final AppUserRepository users;
    private final CurrentUserProvider currentUserProvider;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    @Transactional
    public void changePassword(ChangePasswordRequest request, HttpServletRequest httpRequest) {
        var principal = currentUserProvider.getCurrentPrincipal();
        var user = users.findByIdForUpdate(principal.getUserId())
                .orElseThrow(() -> new NotFoundException("User was not found"));
        if (!user.isEnabled() || user.isLocked() || user.getCredentialVersion() != principal.getCredentialVersion()
                || !encoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ConflictException("CURRENT_PASSWORD_INVALID", "security.password.currentInvalid", "Current password or session is invalid");
        }
        PasswordPolicy.validate(request.newPassword());
        if (encoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new ConflictException("PASSWORD_UNCHANGED", "security.password.unchanged", "New password must differ from current password");
        }
        user.setPasswordHash(encoder.encode(request.newPassword()));
        user.setPasswordChangeRequired(false);
        user.setCredentialVersion(user.getCredentialVersion() + 1);
        user.setUpdatedBy(user.getId());
        audit.log(AuditEventType.USER_UPDATED, AuditTargetType.USER, user.getId().toString(),
                ActionResult.SUCCESS, user.getId(), httpRequest, Map.of("operation", "PASSWORD_CHANGED"));
    }
}

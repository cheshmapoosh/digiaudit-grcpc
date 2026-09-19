package com.digiaudit.grcpc.modules.auth.api;

import com.digiaudit.grcpc.common.security.CurrentUser;
import com.digiaudit.grcpc.modules.auth.api.dto.AuthMeResponse;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AppUserRepository users;

    @GetMapping("/me")
    public ResponseEntity<AuthMeResponse> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof CurrentUser currentUser)) {
            return ResponseEntity.ok(
                    new AuthMeResponse(false, null, null, null, null, false, Set.of())
            );
        }

        Set<String> authorities = currentUser.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(code -> !code.startsWith("MD_"))
                .collect(Collectors.toSet());
        authorities.addAll(users.findActiveBusinessPermissionCodes(currentUser.getUserId()).stream()
                .filter(code -> code.startsWith("MD_"))
                .toList());

        return ResponseEntity.ok(
                new AuthMeResponse(
                        true,
                        currentUser.getUserId(),
                        currentUser.getUsername(),
                        currentUser.getFirstName(),
                        currentUser.getLastName(),
                        currentUser.isRootUser(),
                        authorities
                )
        );
    }
}
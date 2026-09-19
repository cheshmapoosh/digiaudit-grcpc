package com.digiaudit.grcpc.modules.auth.api;

import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.PostMapping;
import com.digiaudit.grcpc.modules.auth.api.dto.ChangePasswordRequest;
import com.digiaudit.grcpc.modules.auth.application.PasswordService;
import com.digiaudit.grcpc.modules.auth.application.UsernameService;
import com.digiaudit.grcpc.modules.auth.api.dto.ChangeUsernameRequest;
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
    private final PasswordService passwordService;
    private final UsernameService usernameService;

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(
            @Valid @RequestBody
            ChangePasswordRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse,
            Authentication authentication) {
        passwordService.changePassword(request, httpRequest);
        new SecurityContextLogoutHandler()
                .logout(httpRequest, httpResponse, authentication);
    }

    @PostMapping("/change-username")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changeUsername(@Valid @RequestBody ChangeUsernameRequest request,
            HttpServletRequest httpRequest, HttpServletResponse httpResponse, Authentication authentication) {
        usernameService.changeUsername(request, httpRequest);
        new SecurityContextLogoutHandler().logout(httpRequest, httpResponse, authentication);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthMeResponse> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof CurrentUser currentUser)) {
            return ResponseEntity.ok(
                    new AuthMeResponse(false, null, null, null, null, false, false, Set.of())
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
                        users.findById(currentUser.getUserId()).orElseThrow().isPasswordChangeRequired(),
                        authorities
                )
        );
    }
}
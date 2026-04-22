package com.digiaudit.grcpc.modules.auth.api;

import com.digiaudit.grcpc.common.security.CurrentUser;
import com.digiaudit.grcpc.modules.auth.api.dto.AuthMeResponse;
import com.digiaudit.grcpc.modules.auth.api.dto.LoginRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.*;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;

    @PostMapping("/login")
    public ResponseEntity<Void> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        request.username(),
                        request.password()
                )
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthMeResponse> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof CurrentUser currentUser)) {
            return ResponseEntity.ok(new AuthMeResponse(false, null, null, null, null, false, java.util.Set.of()));
        }

        return ResponseEntity.ok(new AuthMeResponse(
                true,
                currentUser.getUserId(),
                currentUser.getUsername(),
                currentUser.getFirstName(),
                currentUser.getLastName(),
                currentUser.isRootUser(),
                currentUser.getAuthorities().stream()
                        .map(a -> a.getAuthority())
                        .collect(Collectors.toSet())
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws Exception {
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        return ResponseEntity.noContent().build();
    }
}
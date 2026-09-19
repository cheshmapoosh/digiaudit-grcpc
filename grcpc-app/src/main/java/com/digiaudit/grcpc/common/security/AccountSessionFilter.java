package com.digiaudit.grcpc.common.security;

import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.filter.OncePerRequestFilter;

/** Checks persisted account state on every API request, including existing sessions. */
@RequiredArgsConstructor
public class AccountSessionFilter extends OncePerRequestFilter {
    private final AppUserRepository users;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String path = request.getServletPath();
        if (path.startsWith("/api/") && authentication != null
                && authentication.getPrincipal() instanceof CurrentUser principal) {
            var user = users.findById(principal.getUserId()).orElse(null);
            if (user == null || !user.isEnabled() || user.isLocked()
                    || user.getCredentialVersion() != principal.getCredentialVersion()) {
                new SecurityContextLogoutHandler().logout(request, response, authentication);
                reject(response, 401, "SESSION_REVOKED");
                return;
            }
            boolean passwordFlow = ("GET".equals(request.getMethod()) && "/api/auth/me".equals(path))
                    || ("POST".equals(request.getMethod()) && "/api/auth/change-password".equals(path));
            if (user.isPasswordChangeRequired() && !passwordFlow) {
                reject(response, 403, "PASSWORD_CHANGE_REQUIRED");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, int status, String code) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        objectMapper.writeValue(response.getWriter(), Map.of("code", code));
    }
}

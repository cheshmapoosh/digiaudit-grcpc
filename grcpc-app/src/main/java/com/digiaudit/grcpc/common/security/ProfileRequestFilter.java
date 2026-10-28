package com.digiaudit.grcpc.common.security;

import com.digiaudit.grcpc.modules.datasetprofile.application.ProfileAccessService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class ProfileRequestFilter extends OncePerRequestFilter {
    private final ProfileAccessService access;
    private final DatabaseUserDetailsService details;
    private final ObjectMapper json;
    private final org.springframework.context.MessageSource messages;
    public ProfileRequestFilter(ProfileAccessService access, DatabaseUserDetailsService details, ObjectMapper json,
            org.springframework.context.MessageSource messages) {
        this.access = access; this.details = details; this.json = json; this.messages = messages;
    }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) { return !request.getServletPath().startsWith("/api/"); }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof CurrentUser principal) {
                String path = request.getServletPath();
                boolean dataset = path.startsWith("/api/master-data/")
                        || path.matches("/api/(objectives|organizations|global-controls|control-groups)(/.*)?")
                        || path.startsWith("/api/dashboard/master-data") || path.startsWith("/api/security/resource-acl");
                boolean mutation = !path.matches("/api/master-data/document-versions/[^/]+/download") && !"GET".equals(request.getMethod()) && !"HEAD".equals(request.getMethod())
                        && !"OPTIONS".equals(request.getMethod());
                UUID profileId = null;
                String header = request.getHeader("X-Profile-Id");
                if (header != null && !header.isBlank()) {
                    try { profileId = UUID.fromString(header); }
                    catch (IllegalArgumentException e) { ProfileAccessService.deny(); }
                }
                // Personal account and global root administration never depend on a selected dataset.
                if (dataset && profileId == null) ProfileContext.requireId();
                if (profileId != null) {
                    try { access.validate(profileId, principal.getUserId(), principal.isRootUser(), dataset && mutation, false); }
                    catch (com.digiaudit.grcpc.common.exception.ForbiddenException e) {
                        if (dataset || (!principal.isRootUser() && path.startsWith("/api/usermanagement/"))) throw e;
                        profileId = null;
                    }
                }
                ProfileContext.set(new ProfileContext.State(profileId, principal.getUserId(), principal.isRootUser()));
                CurrentUser live = (CurrentUser) details.loadUserByUsername(principal.getUsername());
                ProfileContext.set(new ProfileContext.State(profileId, live.getUserId(), live.isRootUser()));
                // Never mutate the session's shared SecurityContext: different tabs use different datasets.
                var requestContext = SecurityContextHolder.createEmptyContext();
                requestContext.setAuthentication(new UsernamePasswordAuthenticationToken(live, null, live.getAuthorities()));
                SecurityContextHolder.setContext(requestContext);
            }
            chain.doFilter(request, response);
        } catch (com.digiaudit.grcpc.common.exception.ForbiddenException e) {
            response.setStatus(403);
            response.setContentType("application/json;charset=UTF-8");
            String message = messages.getMessage(e.getMessageCode(), e.getMessageArgs(), e.getDeveloperMessage(), request.getLocale());
            json.writeValue(response.getWriter(), Map.of("code", e.getErrorCode(), "message", message));
        } catch (org.springframework.security.core.AuthenticationException e) {
            response.setStatus(401);
            response.setContentType("application/json;charset=UTF-8");
            json.writeValue(response.getWriter(), Map.of("code", "SESSION_REVOKED"));
        } finally { ProfileContext.clear(); }
    }
}

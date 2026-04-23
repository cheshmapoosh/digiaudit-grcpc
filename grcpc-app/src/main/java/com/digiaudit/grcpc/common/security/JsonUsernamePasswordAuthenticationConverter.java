package com.digiaudit.grcpc.common.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationConverter;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class JsonUsernamePasswordAuthenticationConverter implements AuthenticationConverter {

    private final ObjectMapper objectMapper;

    @Override
    public Authentication convert(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(request.getInputStream());

            String username = root.path("username").asText("");
            String password = root.path("password").asText("");

            if (username.isBlank() || password.isBlank()) {
                log.debug("Login payload is missing username or password");
                return null;
            }

            return UsernamePasswordAuthenticationToken.unauthenticated(username, password);
        } catch (IOException exception) {
            log.warn("Unable to parse login request body", exception);
            return null;
        }
    }
}
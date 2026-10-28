package com.digiaudit.grcpc.common.security;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DatabaseUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;
    private final com.digiaudit.grcpc.modules.datasetprofile.application.ProfileAccessService profileAccess;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        log.debug("Loading user details for username={}", username);

        AppUserEntity user = appUserRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(username));

        if (!user.isEnabled()) {
            log.warn(
                    "Authentication rejected because user is disabled. username={}, userId={}",
                    username,
                    user.getId()
            );
            throw new DisabledException("User is disabled");
        }

        if (user.isLocked()) {
            log.warn(
                    "Authentication rejected because user is locked. username={}, userId={}",
                    username,
                    user.getId()
            );
            throw new LockedException("User is locked");
        }

        Set<GrantedAuthority> authorities = new LinkedHashSet<>();

        if (user.isRootUser()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ROOT"));
            authorities.add(new SimpleGrantedAuthority("ROLE_ROOT_ADMIN"));
        }

        appUserRepository.findActiveRoleCodes(user.getId())
                .stream()
                .filter(code -> code != null && !code.isBlank() && !"ROOT_ADMIN".equals(code) && !"PROFILE_ADMIN".equals(code))
                .map(code -> new SimpleGrantedAuthority("ROLE_" + code))
                .forEach(authorities::add);

        appUserRepository.findActivePermissionCodes(user.getId())
                .stream()
                .filter(code -> code != null && !code.isBlank())
                .map(SimpleGrantedAuthority::new)
                .forEach(authorities::add);

        appUserRepository.findActiveBusinessPermissionCodes(user.getId())
                .stream()
                .filter(code -> code != null && !code.isBlank())
                .map(SimpleGrantedAuthority::new)
                .forEach(authorities::add);

        if (ProfileContext.idOrNull() != null && user.isProfileAdmin() && profileAccess.isAdmin(user.getId(), ProfileContext.requireId())) {
            authorities.add(new SimpleGrantedAuthority("ROLE_PROFILE_ADMIN"));
            for (String area : java.util.List.of("PROCESS", "RISK", "CONTROL", "GOVERNANCE", "REFERENCE"))
                authorities.add(new SimpleGrantedAuthority("MD_" + area + "_MANAGE"));
            for (String permission : java.util.List.of("USER_VIEW", "USER_CREATE", "USER_EDIT", "USER_DISABLE", "USER_ASSIGN_ROLE"))
                authorities.add(new SimpleGrantedAuthority(permission));
        }
        log.debug(
                "User details loaded. username={}, authorityCount={}",
                username,
                authorities.size()
        );

        return CurrentUser.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .rootUser(user.isRootUser())
                .credentialVersion(user.getCredentialVersion())
                .enabled(user.isEnabled())
                .accountNonExpired(true)
                .accountNonLocked(!user.isLocked())
                .credentialsNonExpired(true)
                .authorities(authorities)
                .build();
    }
}
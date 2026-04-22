package com.digiaudit.grcpc.common.security;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUserEntity user = appUserRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(username));

        return CurrentUser.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .rootUser(user.isRootUser())
                .enabled(user.isEnabled())
                .accountNonExpired(true)
                .accountNonLocked(!user.isLocked())
                .credentialsNonExpired(true)
                .authorities(
                        user.isRootUser()
                                ? List.of(new SimpleGrantedAuthority("ROLE_ROOT"))
                                : List.of(new SimpleGrantedAuthority("ROLE_USER"))
                )
                .build();
    }
}
package com.digiaudit.grcpc.domain.security;

import com.digiaudit.grcpc.domain.common.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "grc_user", schema = "grcpc")
public class GrcUser extends BaseEntity {

    @Column(name = "username", nullable = false, unique = true)
    private String username;
}

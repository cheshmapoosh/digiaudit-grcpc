package com.digiaudit.grcpc.common.persistence;

import com.digiaudit.grcpc.common.security.ProfileContext;
import jakarta.persistence.MappedSuperclass;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

@MappedSuperclass
@FilterDef(name = "datasetProfile", autoEnabled = true, applyToLoadByKey = true,
        parameters = @ParamDef(name = "profileId", type = byte[].class, resolver = ProfileContext.FilterValue.class))
public abstract class ProfileFilterDefinition {}

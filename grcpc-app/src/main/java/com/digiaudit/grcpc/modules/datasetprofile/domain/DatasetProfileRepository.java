package com.digiaudit.grcpc.modules.datasetprofile.domain;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DatasetProfileRepository extends JpaRepository<DatasetProfileEntity, UUID> {}

package com.digiaudit.grcpc.modules.masterdata.objective.api;

import com.digiaudit.grcpc.modules.masterdata.objective.domain.ObjectiveEntity;
import org.springframework.stereotype.Component;

@Component
public class ObjectiveMapper {
  public ObjectiveDtos.Detail detail(ObjectiveEntity e) {
    return new ObjectiveDtos.Detail(e.getId(), "objective", e.getCode(), e.getName(),
        e.getDescription(), e.getObjectiveType(), e.getParentObjectiveId(), e.getValidFrom(),
        e.getValidTo(), e.getStatus(), e.getVersion(), e.getCreatedAt(), e.getUpdatedAt());
  }
}

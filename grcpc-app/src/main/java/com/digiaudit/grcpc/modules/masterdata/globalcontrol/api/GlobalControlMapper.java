package com.digiaudit.grcpc.modules.masterdata.globalcontrol.api;

import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.ControlGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.GlobalControlEntity;
import org.springframework.stereotype.Component;

@Component
public class GlobalControlMapper {
  public ControlGroupDtos.Detail group(ControlGroupEntity e) {
    return new ControlGroupDtos.Detail(e.getId(), "controlGroup", e.getCode(), e.getName(),
        e.getDescription(), e.getParentId(), e.getValidFrom(), e.getValidTo(),
        e.getStatus(), e.getVersion(), e.getCreatedAt(), e.getUpdatedAt());
  }

  public GlobalControlDtos.Detail control(GlobalControlEntity e) {
    return new GlobalControlDtos.Detail(e.getId(), "globalControl", e.getCode(), e.getName(),
        e.getDescription(), e.getControlGroupId(), e.getControlType(),
        Boolean.TRUE.equals(e.getTestRequired()), e.getValidFrom(), e.getValidTo(),
        e.getStatus(), e.getVersion(), e.getCreatedAt(), e.getUpdatedAt());
  }
}

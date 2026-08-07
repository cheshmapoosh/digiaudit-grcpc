package com.digiaudit.grcpc.modules.masterdata.catalog.shared.application;

import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.stereotype.Component;

@Component
public class CatalogHierarchySupport {
  public <T extends CentralDefinitionEntity> T requireParent(
      UUID targetId, UUID parentId, Map<UUID, T> hierarchy, String parentLabel) {
    if (parentId == null) {
      return null;
    }
    if (parentId.equals(targetId)) {
      throw new UnprocessableEntityException(
          "HIERARCHY_SELF_PARENT",
          "error.masterdata.v2.hierarchySelfParent",
          "An item cannot be its own parent");
    }
    T parent = hierarchy.get(parentId);
    if (parent == null || parent.getStatus() == MasterDataLifecycleStatus.DELETED) {
      throw new UnprocessableEntityException(
          "PARENT_NOT_FOUND",
          "error.masterdata.v2.parentNotFound",
          parentLabel + " not found",
          parentId);
    }
    return parent;
  }

  public <T extends CentralDefinitionEntity> void rejectCycle(
      UUID targetId, UUID parentId, Map<UUID, T> hierarchy, Function<T, UUID> parentIdReader) {
    Set<UUID> visited = new HashSet<>();
    UUID cursor = parentId;
    while (cursor != null) {
      if (cursor.equals(targetId) || !visited.add(cursor)) {
        throw new UnprocessableEntityException(
            "HIERARCHY_CYCLE",
            "error.masterdata.v2.hierarchyCycle",
            "The move would create a hierarchy cycle");
      }
      T parent = hierarchy.get(cursor);
      cursor = parent == null ? null : parentIdReader.apply(parent);
    }
  }
}

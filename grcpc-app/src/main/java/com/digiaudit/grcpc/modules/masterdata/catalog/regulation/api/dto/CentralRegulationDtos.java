package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class CentralRegulationDtos {
    private CentralRegulationDtos() {}
    public record CreateGroup(@NotBlank String code,@NotBlank String title,UUID parentGroupId,String description,Integer sortOrder,LocalDate validFrom,LocalDate validTo,@Valid DocumentAggregateBatchRequest documents){}
    public record CreateRegulation(@NotBlank String code,@NotBlank String title,@NotNull UUID regulationGroupId,String description,Integer sortOrder,LocalDate validFrom,LocalDate validTo,@Valid DocumentAggregateBatchRequest documents){}
    public record CreateRequirement(@NotBlank String code,@NotBlank String title,@NotNull UUID regulationId,String description,Integer sortOrder,LocalDate validFrom,LocalDate validTo,@Valid DocumentAggregateBatchRequest documents){}
    public record Update(@NotBlank String title,String description,LocalDate validFrom,LocalDate validTo,@NotNull Long version,@Valid DocumentAggregateBatchRequest documents){}
    public record MoveGroup(UUID parentGroupId,Integer sortOrder,@NotNull Long version){}
    public record MoveRegulation(@NotNull UUID regulationGroupId,Integer sortOrder,@NotNull Long version){}
    public record MoveRequirement(@NotNull UUID regulationId,Integer sortOrder,@NotNull Long version){}
    public record Summary(UUID id,String code,String title,UUID parentId,int sortOrder,MasterDataLifecycleStatus status,LocalDate validFrom,LocalDate validTo,long version){}
    public record Detail(UUID id,String code,String title,UUID parentId,String description,int sortOrder,MasterDataLifecycleStatus status,LocalDate validFrom,LocalDate validTo,long version,Instant createdAt,UUID createdBy,Instant updatedAt,UUID updatedBy,Instant deletedAt,UUID deletedBy){}
    public record GroupTree(UUID id,String code,String title,UUID parentGroupId,int sortOrder,MasterDataLifecycleStatus status,long version,List<GroupTree> children){}
}

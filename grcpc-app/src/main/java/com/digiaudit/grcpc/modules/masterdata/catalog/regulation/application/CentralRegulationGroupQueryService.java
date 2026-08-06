package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import org.springframework.stereotype.Service;
import java.util.List;import java.util.UUID;
@Service public class CentralRegulationGroupQueryService{private final CentralRegulationQueryService family;public CentralRegulationGroupQueryService(CentralRegulationQueryService family){this.family=family;}public List<CentralRegulationDtos.Summary> list(){return family.groups();}public List<CentralRegulationDtos.Summary> deleted(){return family.deletedGroups();}public CentralRegulationDtos.Detail detail(UUID id){return family.group(id);}public List<CentralRegulationDtos.GroupTree> tree(){return family.tree();}}

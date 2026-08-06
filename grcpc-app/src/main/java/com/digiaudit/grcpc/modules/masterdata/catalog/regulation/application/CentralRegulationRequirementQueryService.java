package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import org.springframework.stereotype.Service;
import java.util.List;import java.util.UUID;
@Service public class CentralRegulationRequirementQueryService{private final CentralRegulationQueryService family;public CentralRegulationRequirementQueryService(CentralRegulationQueryService family){this.family=family;}public List<CentralRegulationDtos.Summary> list(UUID regulationId){return family.requirements(regulationId);}public List<CentralRegulationDtos.Summary> deleted(){return family.deletedRequirements();}public CentralRegulationDtos.Detail detail(UUID id){return family.requirement(id);}}

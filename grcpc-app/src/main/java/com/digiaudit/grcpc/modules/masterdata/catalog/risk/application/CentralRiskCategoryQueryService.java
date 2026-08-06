package com.digiaudit.grcpc.modules.masterdata.catalog.risk.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CentralRiskCategoryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CentralRiskCategorySummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CentralRiskCategoryTreeResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.mapper.CentralRiskMapper;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskCategoryEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskCategoryRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CentralRiskCategoryQueryService {
    private final CentralRiskCategoryRepository repository;
    private final CentralRiskMapper mapper;

    public CentralRiskCategoryQueryService(CentralRiskCategoryRepository repository, CentralRiskMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<CentralRiskCategorySummaryResponse> list() {
        return repository.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
                .stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public List<CentralRiskCategorySummaryResponse> listDeleted() {
        return repository.findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
                .stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public CentralRiskCategoryResponse detail(UUID id) {
        return repository.findByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
                .map(mapper::toResponse).orElseThrow(() -> notFound(id));
    }

    @Transactional(readOnly = true)
    public List<CentralRiskCategoryTreeResponse> tree() {
        List<CentralRiskCategoryEntity> entities = repository.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED);
        Map<UUID, Node> byId = new HashMap<>();
        entities.forEach(entity -> byId.put(entity.getId(), new Node(entity)));
        List<Node> roots = new ArrayList<>();
        for (CentralRiskCategoryEntity entity : entities) {
            Node node = byId.get(entity.getId());
            Node parent = byId.get(entity.getParentCategoryId());
            if (parent == null) roots.add(node); else parent.children.add(node);
        }
        roots.sort(Node.ORDER);
        return roots.stream().map(Node::response).toList();
    }

    private NotFoundException notFound(UUID id) {
        return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", "Risk Category not found", id);
    }

    private static final class Node {
        private static final Comparator<Node> ORDER = Comparator.comparingInt((Node n) -> n.entity.getSortOrder())
                .thenComparing(n -> n.entity.getTitle(), String.CASE_INSENSITIVE_ORDER).thenComparing(n -> n.entity.getId());
        private final CentralRiskCategoryEntity entity;
        private final List<Node> children = new ArrayList<>();
        private Node(CentralRiskCategoryEntity entity) { this.entity = entity; }
        private CentralRiskCategoryTreeResponse response() {
            children.sort(ORDER);
            return new CentralRiskCategoryTreeResponse(entity.getId(), entity.getCode(), entity.getTitle(),
                    entity.getParentCategoryId(), entity.getSortOrder(), entity.getStatus(), entity.getVersion(),
                    children.stream().map(Node::response).toList());
        }
    }
}

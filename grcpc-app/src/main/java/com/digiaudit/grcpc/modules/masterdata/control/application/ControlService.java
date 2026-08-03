package com.digiaudit.grcpc.modules.masterdata.control.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlSummaryDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.mapper.ControlMapper;
import com.digiaudit.grcpc.modules.masterdata.control.domain.repository.ControlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ControlService {
    private final ControlRepository controlRepository;
    private final ControlMapper mapper;

    public List<ControlSummaryDto> listControls() {
        return controlRepository.findAllByOrderByCodeAscNameAsc()
                .stream()
                .map(mapper::toSummary)
                .toList();
    }

    public ControlSummaryDto getControl(UUID controlId) {
        return controlRepository.findById(controlId)
                .map(mapper::toSummary)
                .orElseThrow(() -> new NotFoundException(
                        "MASTER_DATA_NOT_FOUND",
                        "error.masterdata.notFound",
                        "Control not found: " + controlId,
                        controlId
                ));
    }
}

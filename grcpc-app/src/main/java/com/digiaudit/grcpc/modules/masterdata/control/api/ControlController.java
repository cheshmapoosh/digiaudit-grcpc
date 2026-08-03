package com.digiaudit.grcpc.modules.masterdata.control.api;

import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlSummaryDto;
import com.digiaudit.grcpc.modules.masterdata.control.application.ControlService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
public class ControlController {

    private final ControlService controlService;

    @GetMapping("/api/controls")
    public List<ControlSummaryDto> listControls() {
        log.debug("REST request to list controls");
        return controlService.listControls();
    }

    @GetMapping("/api/controls/{controlId}")
    public ControlSummaryDto getControl(@PathVariable UUID controlId) {
        log.debug("REST request to get control. controlId={}", controlId);
        return controlService.getControl(controlId);
    }

}

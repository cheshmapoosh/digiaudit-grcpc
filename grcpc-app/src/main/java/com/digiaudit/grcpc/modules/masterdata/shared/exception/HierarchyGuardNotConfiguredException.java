package com.digiaudit.grcpc.modules.masterdata.shared.exception;

import com.digiaudit.grcpc.common.exception.BusinessException;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataErrorCode;

public final class HierarchyGuardNotConfiguredException extends BusinessException {
    public HierarchyGuardNotConfiguredException() {
        super(
                MasterDataErrorCode.HIERARCHY_GUARD_NOT_CONFIGURED.code(),
                "error.masterdata.v2.hierarchyGuardNotConfigured",
                "Required hierarchy coordination is not configured"
        );
    }
}

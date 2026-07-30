package com.digiaudit.grcpc.modules.masterdata.shared.exception;

import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataErrorCode;

import java.time.LocalDate;

public final class MasterDataDateRangeInvalidException extends UnprocessableEntityException {
    public MasterDataDateRangeInvalidException(LocalDate validFrom, LocalDate validTo) {
        super(
                MasterDataErrorCode.DATE_RANGE_INVALID.code(),
                "error.masterdata.v2.dateRangeInvalid",
                "validTo must be on or after validFrom",
                validFrom,
                validTo
        );
    }
}

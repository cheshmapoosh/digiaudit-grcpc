package com.digiaudit.grcpc.modules.masterdata.shared.domain;

public enum MasterDataErrorCode {
    VERSION_CONFLICT("VERSION_CONFLICT"),
    MASTERDATA_REVISION_REQUIRED("MASTERDATA_REVISION_REQUIRED"),
    REVISION_DOMAIN_MISMATCH("REVISION_DOMAIN_MISMATCH"),
    DATE_RANGE_INVALID("DATE_RANGE_INVALID");

    private final String code;

    MasterDataErrorCode(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    @Override
    public String toString() {
        return code;
    }
}

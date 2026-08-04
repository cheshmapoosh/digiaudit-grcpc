package com.digiaudit.grcpc.modules.masterdata.shared.domain;

public enum MasterDataErrorCode {
    VERSION_CONFLICT("VERSION_CONFLICT"),
    MASTERDATA_REVISION_REQUIRED("MASTERDATA_REVISION_REQUIRED"),
    REVISION_DOMAIN_MISMATCH("REVISION_DOMAIN_MISMATCH"),
    INVALID_LIFECYCLE_TRANSITION("INVALID_LIFECYCLE_TRANSITION"),
    INVALID_LIFECYCLE_FILTER("INVALID_LIFECYCLE_FILTER"),
    INVALID_HIERARCHY_MOVE("INVALID_HIERARCHY_MOVE"),
    HIERARCHY_BUSY("HIERARCHY_BUSY"),
    HIERARCHY_GUARD_NOT_CONFIGURED("HIERARCHY_GUARD_NOT_CONFIGURED"),
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

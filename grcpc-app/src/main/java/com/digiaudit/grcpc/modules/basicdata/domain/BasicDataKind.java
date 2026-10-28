package com.digiaudit.grcpc.modules.basicdata.domain;

public enum BasicDataKind {
    ORGANIZATION_TYPE("basic_organization_type", "organization", "organization_type_id"),
    DOCUMENT_TYPE("basic_document_type", "document", "document_type_id");

    public final String table;
    public final String referenceTable;
    public final String referenceColumn;
    BasicDataKind(String table, String referenceTable, String referenceColumn) {
        this.table = table; this.referenceTable = referenceTable; this.referenceColumn = referenceColumn;
    }
}

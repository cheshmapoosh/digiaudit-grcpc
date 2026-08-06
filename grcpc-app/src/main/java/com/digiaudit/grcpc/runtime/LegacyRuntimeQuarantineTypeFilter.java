package com.digiaudit.grcpc.runtime;

import org.springframework.core.type.classreading.MetadataReader;
import org.springframework.core.type.classreading.MetadataReaderFactory;
import org.springframework.core.type.filter.TypeFilter;

import java.util.Set;

public final class LegacyRuntimeQuarantineTypeFilter implements TypeFilter {

    // These packages now contain only converter/value classes referenced by untouched
    // legacy test sources. They are not part of the Central Catalog V2 runtime.
    private static final Set<String> LEGACY_PACKAGE_PREFIXES = Set.of(
            "com.digiaudit.grcpc.modules.masterdata.accountgroup.",
            "com.digiaudit.grcpc.modules.masterdata.risk."
    );

    private static final Set<String> LEGACY_CLASS_NAME_PREFIXES = Set.of(
            "DocumentAttachment",
            "ObjectiveOrganizationAssignment",
            "OrganizationProcessAssignment",
            "OrganizationProcessRiskAssignment",
            "OrganizationReferenceAssignment",
            "ProcessAccountGroupAssignment",
            "ProcessControlAssignment",
            "ProcessObjectiveAssignment",
            "ProcessRegulationAssignment",
            "ProcessRiskAssignment"
    );

    @Override
    public boolean match(MetadataReader metadataReader, MetadataReaderFactory metadataReaderFactory) {
        String className = metadataReader.getClassMetadata().getClassName();
        return isLegacyPackage(className) || isLegacyClassFamily(className);
    }

    private static boolean isLegacyPackage(String className) {
        return LEGACY_PACKAGE_PREFIXES.stream().anyMatch(className::startsWith);
    }

    private static boolean isLegacyClassFamily(String className) {
        String simpleName = className.substring(className.lastIndexOf('.') + 1);
        return LEGACY_CLASS_NAME_PREFIXES.stream().anyMatch(simpleName::startsWith);
    }
}

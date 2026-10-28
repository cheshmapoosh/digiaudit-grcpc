package com.digiaudit.grcpc.modules.datasetprofile.application;

import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import java.util.Map;
import java.util.Set;

/** Stable text identifiers shared with the bundled profile identity picker. */
public final class ProfileIdentity {
    private static final Map<String, String> COLORS = Map.ofEntries(
            Map.entry("blue", "#0070F2"),
            Map.entry("navy", "#1B4F72"),
            Map.entry("sky", "#2980B9"),
            Map.entry("cyan", "#008B8B"),
            Map.entry("teal", "#00796B"),
            Map.entry("green", "#2E7D32"),
            Map.entry("forest", "#145A32"),
            Map.entry("olive", "#6B8E23"),
            Map.entry("lime", "#7CB342"),
            Map.entry("yellow", "#F9A825"),
            Map.entry("amber", "#FF8F00"),
            Map.entry("orange", "#E76500"),
            Map.entry("coral", "#E76F51"),
            Map.entry("red", "#C0392B"),
            Map.entry("burgundy", "#7B241C"),
            Map.entry("pink", "#C2185B"),
            Map.entry("purple", "#8E44AD"),
            Map.entry("indigo", "#5B2C6F"),
            Map.entry("slate", "#546E7A"),
            Map.entry("brown", "#795548"));
    private static final Set<String> ICONS = Set.of(
            "building",
            "company-view",
            "org-chart",
            "official-service",
            "factory",
            "business-objects-experience",
            "functional-location",
            "home",
            "group",
            "world",
            "globe",
            "customer",
            "manager",
            "collaborate",
            "business-card",
            "capital-projects",
            "retail-store",
            "education",
            "supplier",
            "suitcase");

    private ProfileIdentity() {}

    public static String colorName(String name) {
        if (name != null && COLORS.containsKey(name)) return name;
        throw new UnprocessableEntityException("PROFILE_COLOR_INVALID", "profile.colorInvalid", "Unknown profile color");
    }

    public static String iconName(String name) {
        if (name == null) return "building";
        if (ICONS.contains(name)) return name;
        throw new UnprocessableEntityException("PROFILE_ICON_INVALID", "profile.iconInvalid", "Unknown profile icon");
    }
}

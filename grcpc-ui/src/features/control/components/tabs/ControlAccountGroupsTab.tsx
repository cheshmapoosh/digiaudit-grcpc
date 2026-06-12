import { useTranslation } from "react-i18next";

import { accountGroupService } from "@/features/account-group/service/accountGroup.service";
import type { ControlAccountGroupLink } from "../../domain/control.model";
import { controlService } from "../../service/control.service";
import ControlLinkTab, { type ControlCatalogOption } from "./ControlLinkTab";
import { displayText } from "./ControlTabUtils";

export interface ControlAccountGroupsTabProps {
    controlAssignmentId: string;
}

async function loadAccountGroupCatalog(): Promise<ControlCatalogOption[]> {
    const items = await accountGroupService.list();

    return items.map((item) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        description: item.description,
    }));
}

function getAccountGroupId(item: ControlAccountGroupLink): string {
    return item.accountGroupId;
}

export default function ControlAccountGroupsTab({
    controlAssignmentId,
}: ControlAccountGroupsTabProps) {
    const { t } = useTranslation();

    return (
        <ControlLinkTab<ControlAccountGroupLink>
            controlAssignmentId={controlAssignmentId}
            title={t("control.tabs.accountGroups", { defaultValue: "Account Groups" })}
            addText={t("control.actions.linkAccountGroup", {
                defaultValue: "Link Account Group",
            })}
            dialogTitle={t("control.accountGroups.linkTitle", {
                defaultValue: "Link Account Group",
            })}
            emptyText={t("control.empty.accountGroups", {
                defaultValue: "No account groups have been linked.",
            })}
            catalogLabel={t("control.fields.accountGroup", { defaultValue: "Account Group" })}
            catalogSearchPlaceholder={t("control.links.searchAccountGroups", {
                defaultValue: "Search account groups",
            })}
            catalogEmptyText={t("control.empty.accountGroupCatalog", {
                defaultValue: "No account groups are available.",
            })}
            listLinks={controlService.listAccountGroups}
            linkItem={controlService.linkAccountGroup}
            deleteLink={controlService.deleteAccountGroupLink}
            loadCatalog={loadAccountGroupCatalog}
            getLinkedReferenceId={getAccountGroupId}
            extraColumns={[
                {
                    key: "assertionType",
                    label: t("control.fields.assertionType", {
                        defaultValue: "Assertion Type",
                    }),
                    render: (item) => displayText(item.assertionType),
                },
            ]}
        />
    );
}

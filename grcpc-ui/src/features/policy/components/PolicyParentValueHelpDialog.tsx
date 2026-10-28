import { DialogFooter } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, List, ListItemStandard } from "@ui5/webcomponents-react";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";

export interface PolicyParentCandidate {
  id: string;
  code: string;
  title: string;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
}

interface Props {
  open: boolean;
  candidates: PolicyParentCandidate[];
  selectedParentId: string | null;
  allowNoParent: boolean;
  busy?: boolean;
  onClose: () => void;
  onSelect: (parentId: string | null) => void;
}

export default function PolicyParentValueHelpDialog({
  open,
  candidates,
  selectedParentId,
  allowNoParent,
  busy = false,
  onClose,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const filteredCandidates = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase("fa");
    if (!query) return candidates;
    return candidates.filter((candidate) =>
      `${candidate.code} ${candidate.title}`.toLocaleLowerCase("fa").includes(query),
    );
  }, [candidates, searchText]);
  const title = t("policy.parent.dialogTitle", { defaultValue: "انتخاب والد" });
  const select = (parentId: string | null) => {
    onSelect(parentId);
    onClose();
  };

  return (
    <Dialog open={open} accessibleName={title} onClose={onClose}>
      <ModalDialogHeader title={title} onClose={onClose}  actions={<HeaderSearch value={searchText} onChange={(value) => setSearchText(value)} disabled={busy} accessibleName={t("policy.parent.search", { defaultValue: "جستجو بر اساس شناسه یا نام" })} />} />
      <div className="policyParentDialogContent">

        <List separators="Inner">
          {allowNoParent ? (
            <ListItemStandard selected={!selectedParentId} onClick={() => select(null)}>
              {t("policy.parent.none", { defaultValue: "بدون والد" })}
            </ListItemStandard>
          ) : null}
          {filteredCandidates.map((candidate) => (
            <ListItemStandard
              key={candidate.id}
              selected={candidate.id === selectedParentId}
              additionalText={candidate.code}
              description={`${candidate.code} — ${candidate.title}`}
              onClick={() => select(candidate.id)}
            >
              {candidate.title}
            </ListItemStandard>
          ))}
        </List>
        <DialogFooter>
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.close", { defaultValue: "بستن" })}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

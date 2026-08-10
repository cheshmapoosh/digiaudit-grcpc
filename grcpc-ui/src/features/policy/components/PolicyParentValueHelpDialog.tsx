import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Input, List, ListItemStandard } from "@ui5/webcomponents-react";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";

export interface PolicyParentCandidate {
  id: string;
  code: string;
  title: string;
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
      <ModalDialogHeader title={title} onClose={onClose} />
      <div className="policyParentDialogContent">
        <Input
          value={searchText}
          disabled={busy}
          placeholder={t("policy.parent.search", { defaultValue: "جستجو بر اساس شناسه یا نام" })}
          onInput={(event) => setSearchText(event.target.value)}
        />
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
        <div className="policyParentDialogFooter">
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.close", { defaultValue: "بستن" })}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

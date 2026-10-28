import { DialogFooter } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Dialog,
  List,
  ListItemStandard,
} from "@ui5/webcomponents-react";

import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";

export interface RegulationParentCandidate {
  id: string;
  code: string;
  title: string;
}

interface Props {
  open: boolean;
  candidates: RegulationParentCandidate[];
  selectedParentId: string | null;
  allowNoParent: boolean;
  busy?: boolean;
  onClose: () => void;
  onSelect: (parentId: string | null) => void;
}

export default function RegulationParentValueHelpDialog({
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
    const query = searchText.trim().toLocaleLowerCase();
    if (!query) return candidates;
    return candidates.filter(
      (candidate) =>
        candidate.code.toLocaleLowerCase().includes(query) ||
        candidate.title.toLocaleLowerCase().includes(query),
    );
  }, [candidates, searchText]);

  const title = t("regulation.parent.dialogTitle", { defaultValue: "انتخاب والد" });

  const select = (parentId: string | null) => {
    onSelect(parentId);
    onClose();
  };

  return (
    <Dialog
      open={open}
      accessibleName={title}
      className="regulationParentDialog"
      onClose={onClose}
    >
      <ModalDialogHeader title={title} onClose={onClose}  actions={<HeaderSearch value={searchText} onChange={(value) => setSearchText(value)} disabled={busy} accessibleName={t("regulation.parent.search", {
            defaultValue: "جستجو بر اساس شناسه یا نام",
          })} />} />
      <div className="regulationParentDialogContent">

        <div className="regulationParentList">
          <List separators="Inner">
            {allowNoParent ? (
              <ListItemStandard
                selected={!selectedParentId}
                onClick={() => select(null)}
              >
                {t("regulation.parent.none")}
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
        </div>
        <DialogFooter>
          <Button design="Transparent" disabled={busy} onClick={onClose}>
            {t("common.close", { defaultValue: "بستن" })}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

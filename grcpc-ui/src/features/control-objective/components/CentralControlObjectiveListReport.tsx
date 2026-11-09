import { CatalogSelectableRow, CatalogDeleteButton } from "@/shared/components/CatalogSelection";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import {
  Bar,
  BusyIndicator,
  Label,
  List,
  ListItemCustom,
  MessageStrip,
  Text,
  Title,
} from "@ui5/webcomponents-react";

import type { CentralControlObjectiveSummary } from "../domain/centralControlObjective.model";

interface Props {
  items: CentralControlObjectiveSummary[];
  selectedId: string | null;
  searchText: string;
  busy?: boolean;
  error?: string | null;
  canCreate: boolean;
  canDelete: boolean;
  onErrorClose: () => void;
  onSearchTextChange: (value: string) => void;
  onCreate: () => void;
  onShow: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

export default function CentralControlObjectiveListReport({
  items,
  selectedId,
  searchText,
  busy = false,
  error,
  canCreate,
  canDelete,
  onErrorClose,
  onSearchTextChange,
  onCreate,
  onShow,
  onDelete,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const visibleItems = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) => item.title.toLocaleLowerCase().includes(query));
  }, [items, searchText]);

  return (
    <div className="controlObjectiveListReport">
      <Bar
        startContent={<>
            <Title level="H4">{t("controlObjective.list.title")}</Title>
            <HeaderSearch value={searchText} onChange={(value) => onSearchTextChange(value)} disabled={busy} accessibleName={t("controlObjective.list.search")} />
        </>}
        endContent={
          <>
            <Button
              design="Emphasized"
              disabled={busy || !canCreate}
              onClick={onCreate}
            >
              {t("common.create", { defaultValue: "ایجاد" })}
            </Button>

            <Button
              design="Default"
              disabled={busy || !selectedId}
              onClick={() => selectedId && onShow(selectedId)}
            >
              {t("controlObjective.actions.view")}
            </Button>
            <CatalogDeleteButton
              design="Negative"
              disabled={busy || !selectedId || !canDelete}
              onClick={() => selectedId && onDelete(selectedId)}
            >
              {t("common.delete", { defaultValue: "حذف" })}
            </CatalogDeleteButton>
          </>
        }
      />


      {error ? (
        <MessageStrip design="Negative" onClose={onErrorClose}>
          {error}
        </MessageStrip>
      ) : null}

      <div className="controlObjectiveListBody">
        {busy ? <BusyIndicator active delay={0} /> : null}
        {!busy && items.length === 0 ? (
          <MessageStrip design="Information" hideCloseButton>
            {t("controlObjective.list.empty")}
          </MessageStrip>
        ) : (
          <List
            header={
              <div className="controlObjectiveListHeader">
                <Label>{t("catalog.tree.title")}</Label>
              </div>
            }
            separators="Inner"
            selectionMode="Single"
            accessibleName={t("controlObjective.list.title")}
            onSelectionChange={(event) => {
              const selectedItem = event.detail.selectedItems[0];
              const id = selectedItem?.dataset.controlObjectiveId;
              if (id && id !== selectedId) onSelect(id);
            }}
          >
            {visibleItems.map((item) => (
              <ListItemCustom
                key={item.id}
                type="Active"
                selected={item.id === selectedId}
                data-control-objective-id={item.id}
              >
                <CatalogSelectableRow itemKey={item.id}>
                  <div className="controlObjectiveListTitle">
                    <Text>{item.title}</Text>
                  </div>
                </CatalogSelectableRow>
              </ListItemCustom>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}

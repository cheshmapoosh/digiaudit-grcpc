import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  Button,
  BusyIndicator,
  Input,
  List,
  ListItemCustom,
  MessageStrip,
  Text,
  Title,
} from "@ui5/webcomponents-react";

import type { CentralControlSummary } from "../domain/centralControl.model";

export interface CentralControlListReportProps {
  items: CentralControlSummary[];
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

export default function CentralControlListReport({
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
}: CentralControlListReportProps) {
  const { t } = useTranslation();
  const actionButtonStyle = useMemo(() => ({ minWidth: "8rem" }), []);
  const visibleItems = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) => item.title.toLocaleLowerCase().includes(query));
  }, [items, searchText]);

  return (
    <div className="controlListReport">
      <Bar
        startContent={<Title level="H4">{t("control.list.title")}</Title>}
        endContent={
          <>
            <Button
              design="Emphasized"
              disabled={busy || !canCreate}
              style={actionButtonStyle}
              onClick={onCreate}
            >
              {t("common.create", { defaultValue: "ایجاد" })}
            </Button>
            <Button
              design="Emphasized"
              disabled={busy || !selectedId}
              style={actionButtonStyle}
              onClick={() => selectedId && onShow(selectedId)}
            >
              {t("control.actions.view")}
            </Button>
            <Button
              design="Negative"
              disabled={busy || !selectedId || !canDelete}
              style={{ ...actionButtonStyle, marginInlineStart: "0.75rem" }}
              onClick={() => selectedId && onDelete(selectedId)}
            >
              {t("common.delete", { defaultValue: "حذف" })}
            </Button>
          </>
        }
      />

      <Input
        value={searchText}
        disabled={busy}
        placeholder={t("control.list.search")}
        onInput={(event) => onSearchTextChange(event.target.value)}
      />

      {error ? (
        <MessageStrip design="Negative" onClose={onErrorClose}>
          {error}
        </MessageStrip>
      ) : null}

      <div className="controlListBody">
        {busy ? <BusyIndicator active delay={0} /> : null}
        <List separators="Inner" accessibleName={t("control.list.title")}>
          {visibleItems.map((item, index) => (
            <ListItemCustom
              key={item.id}
              type="Active"
              selected={item.id === selectedId}
              onClick={() => {
                if (item.id !== selectedId) onSelect(item.id);
              }}
            >
              <div
                dir="rtl"
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "4rem minmax(0, 1fr)",
                  alignItems: "center",
                  columnGap: "1rem",
                  boxSizing: "border-box",
                  paddingInline: "0.5rem",
                }}
              >
                <Text style={{ textAlign: "right" }}>{index + 1}</Text>
                <Text style={{ textAlign: "right" }}>{item.title}</Text>
              </div>
            </ListItemCustom>
          ))}
        </List>
      </div>
    </div>
  );
}

import { Button, Title } from "@ui5/webcomponents-react";
import type { DefinitionListRow } from "./catalogPresentation.model";

interface Props<T extends DefinitionListRow> {
  title: string;
  rows: T[];
  selectedId: string | null;
  busy: boolean;
  canCreate: boolean;
  onSelect: (row: T) => void;
  onCreate: () => void;
}

export function HierarchyColumn<T extends DefinitionListRow>({
  title,
  rows,
  selectedId,
  busy,
  canCreate,
  onSelect,
  onCreate,
}: Props<T>) {
  return (
    <section className="catalogHierarchyColumn">
      <header className="catalogToolbar">
        <Title level="H4">{title}</Title>
        <Button
          design="Emphasized"
          hidden={!canCreate}
          disabled={busy}
          onClick={onCreate}
        >
          +
        </Button>
      </header>
      <div className="catalogHierarchyList">
        {rows.map((row) => (
          <Button
            key={row.id}
            design={selectedId === row.id ? "Emphasized" : "Transparent"}
            disabled={busy}
            onClick={() => onSelect(row)}
          >
            {row.code} — {row.title}
          </Button>
        ))}
      </div>
    </section>
  );
}

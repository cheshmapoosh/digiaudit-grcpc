import { useEffect, useMemo, useState } from "react";
import { Button, Input, List, ListItemStandard, Title, Toolbar, ToolbarSpacer } from "@ui5/webcomponents-react";
import { useRegulationStore } from "../state/regulation.store";

export default function RegulationsListReport() {
    const load = useRegulationStore((s) => s.load);
    const items = useRegulationStore((s) => s.items);
    const select = useRegulationStore((s) => s.select);

    const [q, setQ] = useState("");

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return items;
        return items.filter((x) => `${x.code} ${x.title}`.toLowerCase().includes(qq));
    }, [items, q]);

    return (
        <div style={{ padding: 12 }}>
            <Toolbar style={{ paddingInline: 0 }}>
                <Title level="H5">لیست قوانین و مقررات</Title>
                <ToolbarSpacer />
                <Input
                    placeholder="جستجو..."
                    value={q}
                    onInput={(e: any) => setQ(e.target.value)}
                    style={{ width: 320 }}
                />
                <Button design="Transparent" onClick={load}>
                    Refresh
                </Button>
            </Toolbar>

            <List>
                {filtered.map((x) => (
                    <ListItemStandard key={x.id} additionalText={x.code} onClick={() => select(x.id)}>
                        {x.title}
                    </ListItemStandard>
                ))}
            </List>
        </div>
    );
}
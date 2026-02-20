import { Card, CardHeader, Text, Title, Button, FlexBox, FlexBoxDirection, FlexBoxJustifyContent } from "@ui5/webcomponents-react";
import { useMemo } from "react";
import { useProcessStore } from "../state/process.store";
import type { ProcessNode } from "../model/process.types";

type Props = {
    onAddChild: (parent: ProcessNode) => void;
    onEdit: (node: ProcessNode) => void;
    onMove: (node: ProcessNode) => void;
    onToggleStatus: (node: ProcessNode) => void;
};

export function ProcessNodeDetails({ onAddChild, onEdit, onMove, onToggleStatus }: Props) {
    const { selectedId, nodesById } = useProcessStore();

    const node = useMemo(() => (selectedId ? nodesById[selectedId] : undefined), [selectedId, nodesById]);

    if (!node) {
        return (
            <Card>
                <CardHeader titleText="جزئیات" />
                <div style={{ padding: 12 }}>
                    <Text>یک نود از درخت را انتخاب کنید.</Text>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader titleText="جزئیات نود" subtitleText={node.code ?? ""} />
            <div style={{ padding: 12, display: "grid", gap: 8 }}>
                <Title level="H5">{node.title}</Title>

                {node.description ? <Text>{node.description}</Text> : <Text>—</Text>}

                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8 }}>
                    <Text>وضعیت</Text>
                    <Text>{node.status}</Text>

                    <Text>والد</Text>
                    <Text>{node.parentId ?? "ROOT"}</Text>

                    <Text>ترتیب</Text>
                    <Text>{String(node.order)}</Text>

                    {node.depth != null ? (
                        <>
                            <Text>عمق</Text>
                            <Text>{String(node.depth)}</Text>
                        </>
                    ) : null}

                    {node.path ? (
                        <>
                            <Text>Path</Text>
                            <Text>{node.path}</Text>
                        </>
                    ) : null}
                </div>

                <FlexBox direction={FlexBoxDirection.Row} justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginTop: 8 }}>
                    <Button design="Emphasized" onClick={() => onAddChild(node)}>
                        افزودن فرزند
                    </Button>

                    <div style={{ display: "flex", gap: 8 }}>
                        <Button onClick={() => onEdit(node)}>ویرایش</Button>
                        <Button onClick={() => onMove(node)}>جابجایی</Button>
                        <Button design="Transparent" onClick={() => onToggleStatus(node)}>
                            {node.status === "ACTIVE" ? "غیرفعال" : "فعال"}
                        </Button>
                    </div>
                </FlexBox>
            </div>
        </Card>
    );
}

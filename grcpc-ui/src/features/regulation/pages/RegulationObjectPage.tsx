import { useMemo, useState } from "react";
import {
    Button,
    Card,
    FlexBox,
    FlexBoxDirection,
    Input,
    Label,
    MessageStrip,
    Select,
    Option,
    TextArea,
    Title,
} from "@ui5/webcomponents-react";

import { useRegulationStore } from "../state/regulation.store";
import type { RegulationStatus } from "../model/regulation.types";
import { ParentValueHelpDialog } from "../components/ParentValueHelpDialog";

export default function RegulationObjectPage() {
    const items = useRegulationStore((s) => s.items);
    const selectedId = useRegulationStore((s) => s.selectedId);
    const select = useRegulationStore((s) => s.select);

    const create = useRegulationStore((s) => s.create);
    const update = useRegulationStore((s) => s.update);
    const remove = useRegulationStore((s) => s.remove);

    const selected = useMemo(() => items.find((x) => x.id === selectedId) ?? null, [items, selectedId]);
    const parent = useMemo(
        () => (selected?.parentId ? items.find((x) => x.id === selected.parentId) ?? null : null),
        [items, selected?.parentId]
    );

    const [form, setForm] = useState({
        code: "",
        title: "",
        description: "",
        parentId: null as string | null,
        status: "DRAFT" as RegulationStatus,
    });

    const [showParentDialog, setShowParentDialog] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // sync form on selection change
    useState(() => {
        if (selected) {
            setForm({
                code: selected.code,
                title: selected.title,
                description: selected.description ?? "",
                parentId: selected.parentId ?? null,
                status: selected.status,
            });
        } else {
            setForm({
                code: "",
                title: "",
                description: "",
                parentId: null,
                status: "DRAFT",
            });
        }
        setError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    });

    const validate = () => {
        if (!form.code.trim()) return "کد الزامی است.";
        if (!form.title.trim()) return "عنوان الزامی است.";
        return null;
    };

    const onSave = async () => {
        const v = validate();
        if (v) return setError(v);

        setError(null);
        if (!selected) {
            const created = await create({
                code: form.code.trim(),
                title: form.title.trim(),
                description: form.description?.trim() || undefined,
                parentId: form.parentId,
                status: form.status,
            });
            select(created.id);
            return;
        }

        await update(selected.id, {
            code: form.code.trim(),
            title: form.title.trim(),
            description: form.description?.trim() || undefined,
            parentId: form.parentId,
            status: form.status,
        });
    };

    const onDelete = async () => {
        if (!selected) return;
        await remove(selected.id);
        select(null);
    };

    return (
        <div style={{ padding: 12 }}>
            <Card style={{ padding: 12 }}>
                <FlexBox direction={FlexBoxDirection.Column} style={{ gap: 10 }}>
                    <FlexBox direction={FlexBoxDirection.Row} style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Title level="H5">{selected ? "جزئیات قانون/مقرره" : "ایجاد قانون/مقرره جدید"}</Title>
                        {selected ? (
                            <Button design="Transparent" onClick={() => select(null)}>
                                جدید
                            </Button>
                        ) : null}
                    </FlexBox>

                    {error ? <MessageStrip design="Negative">{error}</MessageStrip> : null}

                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
                        <Label>کد</Label>
                        <Input value={form.code} onInput={(e: any) => setForm((p) => ({ ...p, code: e.target.value }))} />

                        <Label>عنوان</Label>
                        <Input value={form.title} onInput={(e: any) => setForm((p) => ({ ...p, title: e.target.value }))} />

                        <Label>وضعیت</Label>
                        <Select
                            valueState="None"
                            onChange={(e: any) => setForm((p) => ({ ...p, status: e.detail.selectedOption.value }))}
                        >
                            <Option value="DRAFT" selected={form.status === "DRAFT"}>پیش‌نویس</Option>
                            <Option value="ACTIVE" selected={form.status === "ACTIVE"}>فعال</Option>
                            <Option value="INACTIVE" selected={form.status === "INACTIVE"}>غیرفعال</Option>
                            <Option value="ARCHIVED" selected={form.status === "ARCHIVED"}>بایگانی</Option>
                        </Select>

                        <Label>والد</Label>
                        <FlexBox direction={FlexBoxDirection.Row} style={{ gap: 8, alignItems: "center" }}>
                            <Input
                                value={
                                    form.parentId
                                        ? `${items.find((x) => x.id === form.parentId)?.code ?? ""} - ${
                                            items.find((x) => x.id === form.parentId)?.title ?? ""
                                        }`
                                        : "ریشه"
                                }
                                readonly
                                style={{ width: "100%" }}
                            />
                            <Button onClick={() => setShowParentDialog(true)}>انتخاب</Button>
                            <Button design="Transparent" onClick={() => setForm((p) => ({ ...p, parentId: null }))}>
                                حذف والد
                            </Button>
                        </FlexBox>

                        <Label>توضیحات</Label>
                        <TextArea
                            rows={4}
                            value={form.description}
                            onInput={(e: any) => setForm((p) => ({ ...p, description: e.target.value }))}
                        />
                    </div>

                    <FlexBox direction={FlexBoxDirection.Row} style={{ gap: 8, justifyContent: "flex-end" }}>
                        {selected ? (
                            <Button design="Negative" onClick={onDelete}>
                                حذف
                            </Button>
                        ) : null}
                        <Button design="Emphasized" onClick={onSave}>
                            ذخیره
                        </Button>
                    </FlexBox>

                    {selected ? (
                        <MessageStrip design="Information">
                            والد فعلی: {parent ? `${parent.code} - ${parent.title}` : "ریشه"}
                        </MessageStrip>
                    ) : null}
                </FlexBox>
            </Card>

            <ParentValueHelpDialog
                open={showParentDialog}
                currentId={selected?.id ?? null}
                currentParentId={form.parentId}
                onClose={() => setShowParentDialog(false)}
                onSelectParent={(pid) => {
                    setForm((p) => ({ ...p, parentId: pid }));
                    setShowParentDialog(false);
                }}
            />
        </div>
    );
}
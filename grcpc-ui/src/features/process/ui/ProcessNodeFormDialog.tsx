import { useEffect, useMemo, useState } from "react";
import { Dialog, Button, Input, TextArea, Form, FormItem, Select, Option } from "@ui5/webcomponents-react";
import type { ProcessNode, ProcessNodeStatus } from "../model/process.types";

type Mode = "create" | "edit";

type Props = {
    open: boolean;
    mode: Mode;

    // در create: parentId مشخص می‌شه (نود انتخاب شده یا null برای ریشه)
    parentId: string | null;

    // در edit: node پاس داده می‌شه
    node?: ProcessNode;

    onClose: () => void;

    onSubmit: (payload: {
        mode: Mode;
        id?: string;
        parentId: string | null;
        title: string;
        code?: string;
        description?: string;
        status: ProcessNodeStatus;
    }) => Promise<void>;
};

export function ProcessNodeFormDialog({ open, mode, parentId, node, onClose, onSubmit }: Props) {
    const initial = useMemo(() => {
        if (mode === "edit" && node) {
            return {
                title: node.title ?? "",
                code: node.code ?? "",
                description: node.description ?? "",
                status: node.status ?? "ACTIVE",
            };
        }
        return { title: "", code: "", description: "", status: "ACTIVE" as ProcessNodeStatus };
    }, [mode, node]);

    const [title, setTitle] = useState(initial.title);
    const [code, setCode] = useState(initial.code);
    const [description, setDescription] = useState(initial.description);
    const [status, setStatus] = useState<ProcessNodeStatus>(initial.status);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setTitle(initial.title);
        setCode(initial.code);
        setDescription(initial.description);
        setStatus(initial.status);
    }, [initial]);

    const canSubmit = title.trim().length > 0 && !saving;

    const submit = async () => {
        if (!canSubmit) return;
        setSaving(true);
        try {
            await onSubmit({
                mode,
                id: mode === "edit" ? node?.id : undefined,
                parentId: mode === "edit" ? (node?.parentId ?? null) : parentId,
                title: title.trim(),
                code: code.trim() ? code.trim() : undefined,
                description: description.trim() ? description.trim() : undefined,
                status,
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            headerText={mode === "create" ? "ایجاد نود جدید" : "ویرایش نود"}
            onAfterClose={onClose}
            footer={
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
                    <Button design="Transparent" onClick={onClose} disabled={saving}>
                        انصراف
                    </Button>
                    <Button design="Emphasized" onClick={submit} disabled={!canSubmit}>
                        {saving ? "در حال ذخیره..." : "ذخیره"}
                    </Button>
                </div>
            }
        >
            <div style={{ padding: 12 }}>
                <Form>
                    <FormItem label="عنوان">
                        <Input value={title} onInput={(e: any) => setTitle(e.target.value)} placeholder="مثلاً: مدیریت ریسک" />
                    </FormItem>

                    <FormItem label="کد">
                        <Input value={code} onInput={(e: any) => setCode(e.target.value)} placeholder="اختیاری" />
                    </FormItem>

                    <FormItem label="وضعیت">
                        <Select
                            value={status}
                            onChange={(e: any) => setStatus(e.detail.selectedOption.value as ProcessNodeStatus)}
                        >
                            <Option value="ACTIVE">ACTIVE</Option>
                            <Option value="INACTIVE">INACTIVE</Option>
                        </Select>
                    </FormItem>

                    <FormItem label="توضیحات">
                        <TextArea value={description} onInput={(e: any) => setDescription(e.target.value)} rows={4} />
                    </FormItem>
                </Form>
            </div>
        </Dialog>
    );
}

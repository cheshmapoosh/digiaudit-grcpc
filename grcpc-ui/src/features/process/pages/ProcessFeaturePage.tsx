// src/features/process/pages/ProcessFeaturePage.tsx

import { useMemo, useState } from "react";
import {
    Button,
    Card,
    CardHeader,
    FlexBox,
    FlexBoxDirection,
    FlexBoxJustifyContent,
    Title,
    Toolbar,
    ToolbarSpacer,
    MessageStrip,
} from "@ui5/webcomponents-react";

import { useProcessStore } from "../state/process.store";
import type { ProcessNode } from "../model/process.types";

import { ProcessTree } from "../ui/ProcessTree";
import { ProcessNodeDetails } from "../ui/ProcessNodeDetails";
import { ProcessNodeFormDialog } from "../ui/ProcessNodeFormDialog";
import { MoveNodeDialog } from "../ui/MoveNodeDialog";

type FormState =
    | { open: false }
    | {
    open: true;
    mode: "create" | "edit";
    parentId: string | null;
    node?: ProcessNode;
};

type MoveState = { open: false } | { open: true; node: ProcessNode };

export default function ProcessFeaturePage() {
    const { selectedId, nodesById, createNode, updateNode } = useProcessStore();

    const selectedNode = useMemo(
        () => (selectedId ? nodesById[selectedId] : undefined),
        [selectedId, nodesById]
    );

    const [formState, setFormState] = useState<FormState>({ open: false });
    const [moveState, setMoveState] = useState<MoveState>({ open: false });

    const [uiError, setUiError] = useState<string | null>(null);

    const openCreateRoot = () => {
        setUiError(null);
        setFormState({ open: true, mode: "create", parentId: null });
    };

    const openCreateChild = () => {
        setUiError(null);
        if (!selectedNode) {
            setUiError("برای ایجاد فرزند، ابتدا یک نود را از درخت انتخاب کنید.");
            return;
        }
        setFormState({ open: true, mode: "create", parentId: selectedNode.id });
    };

    const openEdit = () => {
        setUiError(null);
        if (!selectedNode) {
            setUiError("برای ویرایش، ابتدا یک نود را از درخت انتخاب کنید.");
            return;
        }
        setFormState({ open: true, mode: "edit", parentId: selectedNode.parentId ?? null, node: selectedNode });
    };

    const openMove = () => {
        setUiError(null);
        if (!selectedNode) {
            setUiError("برای جابجایی، ابتدا یک نود را از درخت انتخاب کنید.");
            return;
        }
        setMoveState({ open: true, node: selectedNode });
    };

    const closeForm = () => setFormState({ open: false });
    const closeMove = () => setMoveState({ open: false });

    const onSubmitForm: React.ComponentProps<typeof ProcessNodeFormDialog>["onSubmit"] = async (payload) => {
        setUiError(null);

        try {
            if (payload.mode === "create") {
                await createNode({
                    parentId: payload.parentId,
                    title: payload.title,
                    code: payload.code,
                    description: payload.description,
                    status: payload.status,
                });
                return;
            }

            if (!payload.id) {
                throw new Error("Missing node id for edit");
            }

            await updateNode(payload.id, {
                title: payload.title,
                code: payload.code,
                description: payload.description,
                status: payload.status,
            });
        } catch (e: any) {
            setUiError(e?.message ?? "خطای نامشخص هنگام ذخیره");
            throw e; // برای اینکه Dialog در حالت saving گیر نکند (اختیاری)
        }
    };

    const onToggleStatus = async (node: ProcessNode) => {
        setUiError(null);
        try {
            await updateNode(node.id, { status: node.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
        } catch (e: any) {
            setUiError(e?.message ?? "خطا در تغییر وضعیت");
        }
    };

    return (
        <div style={{ padding: 12, display: "grid", gap: 12 }}>
            {/* Header */}
            <Card>
                <CardHeader
                    titleText="فرآیندها"
                    subtitleText="مدیریت فرآیندها به صورت چندسطحی (Tree)"
                />
                <div style={{ padding: 12 }}>
                    <Toolbar design="Auto">
                        <Title level="H5">عملیات</Title>
                        <ToolbarSpacer />
                        <Button design="Emphasized" onClick={openCreateRoot}>
                            ایجاد ریشه
                        </Button>
                        <Button onClick={openCreateChild} disabled={!selectedNode}>
                            ایجاد فرزند
                        </Button>
                        <Button onClick={openEdit} disabled={!selectedNode}>
                            ویرایش
                        </Button>
                        <Button onClick={openMove} disabled={!selectedNode}>
                            جابجایی
                        </Button>
                    </Toolbar>

                    {uiError ? (
                        <div style={{ marginTop: 10 }}>
                            <MessageStrip design="Negative" hideCloseButton={false} onClose={() => setUiError(null)}>
                                {uiError}
                            </MessageStrip>
                        </div>
                    ) : null}
                </div>
            </Card>

            {/* Content */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "380px 1fr",
                    gap: 12,
                    alignItems: "start",
                }}
            >
                {/* Left: Tree */}
                <Card style={{ height: "calc(100vh - 220px)" }}>
                    <CardHeader titleText="درخت فرآیندها" />
                    <div style={{ padding: 12 }}>
                        <FlexBox
                            direction={FlexBoxDirection.Row}
                            justifyContent={FlexBoxJustifyContent.SpaceBetween}
                            style={{ marginBottom: 8 }}
                        >
                            <Title level="H6">Tree</Title>
                            <Button design="Transparent" onClick={() => setUiError(null)}>
                                پاک کردن پیام
                            </Button>
                        </FlexBox>

                        <ProcessTree height="calc(100vh - 320px)" />
                    </div>
                </Card>

                {/* Right: Details */}
                <div style={{ display: "grid", gap: 12 }}>
                    <ProcessNodeDetails
                        onAddChild={(parent) => {
                            setUiError(null);
                            setFormState({ open: true, mode: "create", parentId: parent.id });
                        }}
                        onEdit={(node) => {
                            setUiError(null);
                            setFormState({ open: true, mode: "edit", parentId: node.parentId ?? null, node });
                        }}
                        onMove={(node) => {
                            setUiError(null);
                            setMoveState({ open: true, node });
                        }}
                        onToggleStatus={onToggleStatus}
                    />

                    {/* جای توسعه‌های بعدی: ریسک‌ها، کنترل‌ها، مالک، مدارک */}
                    <Card>
                        <CardHeader titleText="بخش‌های مرتبط" subtitleText="(برای مرحله بعدی: Risk, Control, Owner, Document...)" />
                        <div style={{ padding: 12 }}>
                            <FlexBox direction={FlexBoxDirection.Row} justifyContent={FlexBoxJustifyContent.SpaceBetween}>
                                <div style={{ display: "grid", gap: 6 }}>
                                    <Title level="H6">پیشنهاد</Title>
                                    <div style={{ opacity: 0.8, fontSize: 13 }}>
                                        بعداً می‌توانیم برای هر نود تب‌های «ریسک‌ها»، «کنترل‌ها»، «مالک فرآیند»، «اسناد» را اضافه کنیم.
                                    </div>
                                </div>
                                <Button disabled design="Transparent">
                                    به‌زودی
                                </Button>
                            </FlexBox>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Dialogs */}
            {formState.open ? (
                <ProcessNodeFormDialog
                    open={formState.open}
                    mode={formState.mode}
                    parentId={formState.parentId}
                    node={formState.node}
                    onClose={closeForm}
                    onSubmit={onSubmitForm}
                />
            ) : null}

            {moveState.open ? (
                <MoveNodeDialog open={moveState.open} node={moveState.node} onClose={closeMove} />
            ) : null}
        </div>
    );
}

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
    Button,
    MessageStrip,
    Table,
    TableCell,
    TableHeaderCell,
    TableHeaderRow,
    TableRow,
    Title,
} from "@ui5/webcomponents-react";

import type {
    ControlAutomation,
    ControlImportance,
    ProcessNode,
    ProcessStatus,
} from "../../domain/process.model";
import { processService } from "../../service/process.service";

interface ProcessControlsTabProps {
    parentId: string | null;
}

type ControlsLoadStatus = "idle" | "loading" | "success" | "error";

interface ControlsLoadState {
    parentId: string | null;
    retryKey: number;
    status: ControlsLoadStatus;
    controls: ProcessNode[];
}

const TABLE_PANEL_STYLE: CSSProperties = {
    minHeight: "15rem",
    background: "var(--sapGroup_ContentBackground)",
    border: "1px solid var(--sapList_BorderColor)",
    padding: "1rem",
};

const ERROR_ACTION_STYLE: CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    paddingTop: "0.75rem",
};

function initialLoadState(parentId: string | null): ControlsLoadState {
    return {
        parentId,
        retryKey: 0,
        status: parentId ? "loading" : "idle",
        controls: [],
    };
}

function formatOptionalValue(value: string | null | undefined, fallback: string): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
}

function resolveAutomationLabel(
    automation: ControlAutomation,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ControlAutomation, string> = {
        manual: t("process.controlAutomation.manual"),
        automated: t("process.controlAutomation.automated"),
        semiAutomated: t("process.controlAutomation.semiAutomated"),
    };

    return map[automation];
}

function resolveImportanceLabel(
    importance: ControlImportance,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ControlImportance, string> = {
        low: t("process.importance.low"),
        medium: t("process.importance.medium"),
        high: t("process.importance.high"),
        critical: t("process.importance.critical"),
    };

    return map[importance];
}

function resolveStatusLabel(
    status: ProcessStatus,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const map: Record<ProcessStatus, string> = {
        active: t("process.status.active"),
        inactive: t("process.status.inactive"),
    };

    return map[status];
}

export default function ProcessControlsTab({ parentId }: ProcessControlsTabProps) {
    const { t } = useTranslation();
    const requestSeq = useRef(0);
    const [retryKey, setRetryKey] = useState(0);
    const [loadState, setLoadState] = useState<ControlsLoadState>(() =>
        initialLoadState(parentId),
    );

    useEffect(() => {
        if (!parentId) {
            return;
        }

        const requestId = requestSeq.current + 1;
        requestSeq.current = requestId;

        processService
            .getChildren(parentId)
            .then((items) => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    parentId,
                    retryKey,
                    status: "success",
                    controls: items.filter((item) => item.nodeType === "control"),
                });
            })
            .catch(() => {
                if (requestSeq.current !== requestId) {
                    return;
                }

                setLoadState({
                    parentId,
                    retryKey,
                    status: "error",
                    controls: [],
                });
            });

        return () => {
            if (requestSeq.current === requestId) {
                requestSeq.current += 1;
            }
        };
    }, [parentId, retryKey]);

    const noneText = t("common.none");
    const controlsTitle = t("process.controls.title");
    const controls =
        loadState.parentId === parentId && loadState.retryKey === retryKey
            ? loadState.controls
            : [];
    const isLoading =
        !!parentId &&
        (loadState.parentId !== parentId ||
            loadState.retryKey !== retryKey ||
            loadState.status === "loading");
    const hasError =
        !!parentId &&
        !isLoading &&
        loadState.parentId === parentId &&
        loadState.retryKey === retryKey &&
        loadState.status === "error";

    if (!parentId) {
        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">{controlsTitle}</Title>

                <div style={{ height: "0.75rem" }} />

                <MessageStrip design="Information" hideCloseButton>
                    {t("process.controls.saveFirst")}
                </MessageStrip>
            </div>
        );
    }

    if (hasError) {
        return (
            <div style={TABLE_PANEL_STYLE}>
                <Title level="H5">{controlsTitle}</Title>

                <div style={{ height: "0.75rem" }} />

                <MessageStrip design="Negative" hideCloseButton>
                    {t("process.controls.loadError")}
                </MessageStrip>

                <div style={ERROR_ACTION_STYLE}>
                    <Button
                        design="Emphasized"
                        disabled={isLoading}
                        onClick={() => setRetryKey((current) => current + 1)}
                    >
                        {t("process.controls.retry")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={TABLE_PANEL_STYLE}>
            <Title level="H5">{controlsTitle}</Title>

            <div style={{ height: "0.75rem" }} />

            <Table
                accessibleName={t("process.controls.tableAccessibleName")}
                alternateRowColors
                headerRow={
                    <TableHeaderRow>
                        <TableHeaderCell width="8rem">
                            {t("process.controls.columns.code")}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="12rem">
                            {t("process.controls.columns.title")}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="10rem">
                            {t("process.controls.columns.controlAutomation")}
                        </TableHeaderCell>
                        <TableHeaderCell minWidth="10rem">
                            {t("process.controls.columns.controlOwner")}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.controls.columns.importance")}
                        </TableHeaderCell>
                        <TableHeaderCell width="8rem">
                            {t("process.controls.columns.status")}
                        </TableHeaderCell>
                    </TableHeaderRow>
                }
                loading={isLoading}
                loadingDelay={0}
                noDataText={t("process.controls.empty")}
                overflowMode="Popin"
            >
                {controls.map((control) => (
                    <TableRow key={control.id} rowKey={control.id}>
                        <TableCell>{formatOptionalValue(control.code, noneText)}</TableCell>
                        <TableCell>{formatOptionalValue(control.title, noneText)}</TableCell>
                        <TableCell>
                            {control.controlAutomation
                                ? resolveAutomationLabel(control.controlAutomation, t)
                                : noneText}
                        </TableCell>
                        <TableCell>{formatOptionalValue(control.controlOwner, noneText)}</TableCell>
                        <TableCell>
                            {control.importance
                                ? resolveImportanceLabel(control.importance, t)
                                : noneText}
                        </TableCell>
                        <TableCell>{resolveStatusLabel(control.status, t)}</TableCell>
                    </TableRow>
                ))}
            </Table>
        </div>
    );
}

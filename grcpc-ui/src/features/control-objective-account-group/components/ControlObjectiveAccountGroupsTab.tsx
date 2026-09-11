import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActionSheet,
  BusyIndicator,
  Button,
  Icon,
  Input,
  Label,
  Link,
  MessageStrip,
  ObjectStatus,
  Option,
  Select,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Title,
} from "@ui5/webcomponents-react";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type {
  ControlObjectiveAccountGroupChange,
  ControlObjectiveAccountGroupClassification,
  ControlObjectiveAccountGroupOption,
  ControlObjectiveClassificationDraftRow,
  ControlObjectiveClassificationDraftState,
} from "../domain/controlObjectiveAccountGroup.model";
import { controlObjectiveAccountGroupApi } from "../infra/controlObjectiveAccountGroup.api";
import {
  useControlObjectiveAccountGroupPermissions,
  useControlObjectiveClassificationDestinationPermissions,
} from "../security/controlObjectiveAccountGroupPermissions";
import { controlObjectiveAccountGroupErrorMessage } from "../utils/controlObjectiveAccountGroupError";
import ControlObjectiveAccountGroupSelectionDialog from "./ControlObjectiveAccountGroupSelectionDialog";
import ControlObjectiveClassificationValidityDialog from "./ControlObjectiveClassificationValidityDialog";
import "../control-objective-account-group.css";

interface Props {
  controlObjectiveId: string | null;
  readOnly: boolean;
  busy?: boolean;
  adoptedCanonical?: ControlObjectiveAccountGroupClassification[] | null;
  allowAccountGroupNavigation?: boolean;
  onDraftStateChange?: (state: ControlObjectiveClassificationDraftState) => void;
}

function flatten(nodes: ControlObjectiveAccountGroupOption[]): ControlObjectiveAccountGroupOption[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function persisted(
  row: ControlObjectiveAccountGroupClassification,
): ControlObjectiveClassificationDraftRow {
  return {
    key: row.classificationId,
    classificationId: row.classificationId,
    accountGroupId: row.accountGroupId,
    accountGroupCode: row.accountGroupCode,
    accountGroupTitle: row.accountGroupTitle,
    parentAccountGroupId: row.parentAccountGroupId,
    accountGroupStatus: row.accountGroupStatus,
    status: row.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    validFrom: row.validFrom,
    validTo: row.validTo,
    version: row.version,
    editState: "FINAL",
    original: row,
  };
}

function same(
  row: ControlObjectiveClassificationDraftRow,
  original: ControlObjectiveAccountGroupClassification,
) {
  return row.validFrom === original.validFrom
    && row.validTo === original.validTo
    && row.status === original.status;
}

function changes(rows: ControlObjectiveClassificationDraftRow[]): ControlObjectiveAccountGroupChange[] {
  return rows.flatMap((row): ControlObjectiveAccountGroupChange[] => {
    if (row.editState === "DRAFT_RESTORE") {
      return [{
        operation: "RESTORE",
        accountGroupId: row.accountGroupId,
        classificationId: row.classificationId,
        version: row.version,
      }];
    }
    if (row.editState === "DRAFT_DELETE") {
      return [{
        operation: "DELETE",
        accountGroupId: row.accountGroupId,
        classificationId: row.classificationId,
        version: row.version,
      }];
    }
    if (!row.original) {
      return [{
        operation: "CREATE_OR_RESTORE",
        accountGroupId: row.accountGroupId,
        validFrom: row.validFrom,
        validTo: row.validTo,
      }];
    }
    if (row.editState !== "DRAFT_EDITED") return [];
    const fieldsChanged = row.validFrom !== row.original.validFrom
      || row.validTo !== row.original.validTo;
    return fieldsChanged
      ? [{
          operation: "UPDATE",
          accountGroupId: row.accountGroupId,
          classificationId: row.classificationId,
          version: row.version,
          validFrom: row.validFrom,
          validTo: row.validTo,
          requestedStatus: row.status,
        }]
      : [{
          operation: row.status === "ACTIVE" ? "ACTIVATE" : "INACTIVATE",
          accountGroupId: row.accountGroupId,
          classificationId: row.classificationId,
          version: row.version,
        }];
  });
}

function opener(event: unknown): HTMLElement | null {
  const value = (event as { currentTarget?: EventTarget | null }).currentTarget;
  return value instanceof HTMLElement ? value : null;
}

export default function ControlObjectiveAccountGroupsTab({
  controlObjectiveId,
  readOnly,
  busy: parentBusy = false,
  adoptedCanonical,
  allowAccountGroupNavigation = true,
  onDraftStateChange,
}: Props) {
  const { t } = useTranslation();
  const permissions = useControlObjectiveAccountGroupPermissions();
  const destinations = useControlObjectiveClassificationDestinationPermissions();
  const [rows, setRows] = useState<ControlObjectiveClassificationDraftRow[]>([]);
  const [deletedRows, setDeletedRows] = useState<ControlObjectiveAccountGroupClassification[]>([]);
  const [options, setOptions] = useState<ControlObjectiveAccountGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [selectOpen, setSelectOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionOpener, setActionOpener] = useState<HTMLElement | null>(null);
  const generation = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++generation.current;
    if (!permissions.view) {
      setRows([]);
      setDeletedRows([]);
      setOptions([]);
      setLoading(false);
      setLoaded(true);
      return;
    }
    setLoading(true);
    setLoaded(false);
    try {
      const [optionResponse, canonical, deleted] = await Promise.all([
        controlObjectiveAccountGroupApi.options(signal),
        controlObjectiveId
          ? controlObjectiveAccountGroupApi.forControlObjective(controlObjectiveId, signal)
          : Promise.resolve([]),
        controlObjectiveId
          ? controlObjectiveAccountGroupApi.deletedForControlObjective(controlObjectiveId, signal)
          : Promise.resolve([]),
      ]);
      if (current !== generation.current) return;
      setOptions(optionResponse.accountGroups);
      setRows(canonical.map(persisted));
      setDeletedRows(deleted);
      setError(null);
      setLoaded(true);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      if (current === generation.current) {
        setError(controlObjectiveAccountGroupErrorMessage(cause, t));
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [controlObjectiveId, permissions.view, t]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (adoptedCanonical == null) return;
    const timer = window.setTimeout(() => {
      setRows(adoptedCanonical.map(persisted));
      const canonicalIds = new Set(adoptedCanonical.map((row) => row.accountGroupId));
      setDeletedRows((current) => current.filter((row) => !canonicalIds.has(row.accountGroupId)));
      setError(null);
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [adoptedCanonical]);

  const pending = useMemo(() => changes(rows), [rows]);
  useEffect(() => onDraftStateChange?.({
    changes: pending,
    dirty: pending.length > 0,
    ready: loaded || !permissions.view,
    invalid: Boolean(error),
  }), [error, loaded, onDraftStateChange, pending, permissions.view]);

  const allOptions = useMemo(() => flatten(options), [options]);
  const deletedByAccountGroupId = useMemo(
    () => new Map(deletedRows.map((row) => [row.accountGroupId, row])),
    [deletedRows],
  );
  const deletedAccountGroupIds = useMemo(
    () => new Set(deletedByAccountGroupId.keys()),
    [deletedByAccountGroupId],
  );
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return rows.filter((row) => (filter === "ALL" || row.status === filter)
      && (!needle || row.accountGroupCode.toLocaleLowerCase().includes(needle)
        || row.accountGroupTitle.toLocaleLowerCase().includes(needle)));
  }, [filter, rows, search]);
  const editing = rows.find((row) => row.key === editKey) ?? null;
  const action = rows.find((row) => row.key === actionKey) ?? null;
  const mutationBusy = parentBusy || loading;

  const confirmSelection = (selected: Set<string>) => {
    setRows((current) => {
      const optionById = new Map(allOptions.map((item) => [item.id, item]));
      const next = current.flatMap((row) => {
        if (row.editState === "DRAFT_RESTORE") {
          return selected.has(row.accountGroupId) ? [row] : [];
        }
        if (selected.has(row.accountGroupId)) {
          return [{
            ...row,
            editState: row.editState === "DRAFT_DELETE" && row.original
              ? "FINAL" as const : row.editState,
          }];
        }
        return row.original
          ? [{ ...row, editState: "DRAFT_DELETE" as const }]
          : [];
      });
      const occupied = new Set(next.map((row) => row.accountGroupId));
      for (const id of selected) {
        if (occupied.has(id)) continue;
        const item = optionById.get(id);
        if (item?.status !== "ACTIVE") continue;
        const deleted = deletedByAccountGroupId.get(id);
        if (deleted) {
          if (!permissions.restore) continue;
          next.push({
            ...persisted(deleted),
            status: "ACTIVE",
            editState: "DRAFT_RESTORE",
          });
          continue;
        }
        if (!permissions.create) continue;
        next.push({
          key: `new:${id}`,
          classificationId: null,
          accountGroupId: id,
          accountGroupCode: item.code,
          accountGroupTitle: item.title,
          parentAccountGroupId: item.parentAccountGroupId,
          accountGroupStatus: item.status,
          status: "ACTIVE",
          validFrom: null,
          validTo: null,
          version: null,
          editState: "DRAFT_NEW",
          original: null,
        });
      }
      return next;
    });
    setSelectOpen(false);
  };

  const saveValidity = (from: string | null, to: string | null) => {
    if (!editKey) return;
    setRows((current) => current.map((row) => {
      if (row.key !== editKey) return row;
      const next = { ...row, validFrom: from, validTo: to };
      return {
        ...next,
        editState: !next.original
          ? "DRAFT_NEW"
          : same(next, next.original) ? "FINAL" : "DRAFT_EDITED",
      };
    }));
    setEditKey(null);
  };

  const setLifecycle = (
    row: ControlObjectiveClassificationDraftRow,
    status: "ACTIVE" | "INACTIVE",
  ) => setRows((current) => current.map((candidate) => candidate.key !== row.key
    ? candidate
    : {
        ...candidate,
        status,
        editState: candidate.original && same({ ...candidate, status }, candidate.original)
          ? "FINAL"
          : candidate.original ? "DRAFT_EDITED" : "DRAFT_NEW",
      }));
  const remove = (row: ControlObjectiveClassificationDraftRow) => setRows((current) =>
    row.original
      ? current.map((candidate) => candidate.key === row.key
          ? { ...candidate, editState: "DRAFT_DELETE" } : candidate)
      : current.filter((candidate) => candidate.key !== row.key));
  const undo = (row: ControlObjectiveClassificationDraftRow) => setRows((current) =>
    row.editState === "DRAFT_RESTORE"
      ? current.filter((candidate) => candidate.key !== row.key)
      : row.original
      ? current.map((candidate) => candidate.key === row.key
          ? persisted(row.original!) : candidate)
      : current.filter((candidate) => candidate.key !== row.key));
  const closeActions = () => {
    setActionKey(null);
    setActionOpener(null);
  };
  const run = (callback: () => void) => {
    closeActions();
    callback();
  };
  const displayStatus = (row: ControlObjectiveClassificationDraftRow) =>
    row.editState === "FINAL"
      ? t(`controlObjectiveAccountGroup.status.${row.status}`)
      : t(`controlObjectiveAccountGroup.editState.${row.editState}`);

  if (!permissions.view) {
    return <MessageStrip design="Information">{t("controlObjectiveAccountGroup.errors.forbidden")}</MessageStrip>;
  }

  return (
    <section className="controlObjectiveAccountGroupTab">
      <div className="controlObjectiveAccountGroupToolbar">
        <Title level="H5">{t("controlObjectiveAccountGroup.title")}</Title>
        <div className="controlObjectiveAccountGroupToolbarGroup">
          <Input
            className="controlObjectiveAccountGroupSearch"
            value={search}
            placeholder={t("controlObjectiveAccountGroup.search")}
            disabled={mutationBusy}
            onInput={(event) => setSearch(event.target.value)}
          />
          <div className="controlObjectiveAccountGroupFilter">
            <Label showColon>{t("controlObjectiveAccountGroup.fields.status")}</Label>
            <Select
              value={filter}
              disabled={mutationBusy}
              onChange={(event) => setFilter(event.target.value as typeof filter)}
            >
              <Option value="ALL">{t("controlObjectiveAccountGroup.filter.all")}</Option>
              <Option value="ACTIVE">{t("controlObjectiveAccountGroup.status.ACTIVE")}</Option>
              <Option value="INACTIVE">{t("controlObjectiveAccountGroup.status.INACTIVE")}</Option>
            </Select>
          </div>
          {!readOnly && (permissions.create || permissions.restore || permissions.delete) ? (
            <Button
              design="Emphasized"
              disabled={mutationBusy || !loaded}
              onClick={() => setSelectOpen(true)}
            >
              {t("controlObjectiveAccountGroup.actions.select")}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <MessageStrip design="Negative" onClose={() => setError(null)}>
          {error}
          <Button design="Transparent" onClick={() => void load()}>
            {t("controlObjectiveAccountGroup.actions.retry")}
          </Button>
        </MessageStrip>
      ) : null}

      {loading ? <BusyIndicator active delay={0} /> : visible.length ? (
        <Table headerRow={(
          <TableHeaderRow>
            <TableHeaderCell>{t("controlObjectiveAccountGroup.fields.accountGroup")}</TableHeaderCell>
            <TableHeaderCell>{t("controlObjectiveAccountGroup.fields.validFrom")}</TableHeaderCell>
            <TableHeaderCell>{t("controlObjectiveAccountGroup.fields.validTo")}</TableHeaderCell>
            <TableHeaderCell>{t("controlObjectiveAccountGroup.fields.status")}</TableHeaderCell>
            {!readOnly ? <TableHeaderCell>{t("common.actions")}</TableHeaderCell> : null}
          </TableHeaderRow>
        )}>
          {visible.map((row) => (
            <TableRow key={row.key} rowKey={row.key}>
              <TableCell>
                {allowAccountGroupNavigation && destinations.accountGroupView ? (
                  <Link href="/account-groups" wrappingType="Normal">
                    {`${row.accountGroupCode} — ${row.accountGroupTitle}`}
                  </Link>
                ) : `${row.accountGroupCode} — ${row.accountGroupTitle}`}
              </TableCell>
              <TableCell>{formatPersianDate(row.validFrom)}</TableCell>
              <TableCell>{formatPersianDate(row.validTo)}</TableCell>
              <TableCell>
                <ObjectStatus
                  state={row.editState === "FINAL" && row.status === "ACTIVE"
                    ? "Positive" : row.editState === "FINAL" ? "None" : "Information"}
                  icon={<Icon
                    name={row.editState === "FINAL" && row.status === "ACTIVE"
                      ? "accept" : row.editState === "FINAL" ? "pause" : "information"}
                    mode="Decorative"
                  />}
                >
                  {displayStatus(row)}
                </ObjectStatus>
              </TableCell>
              {!readOnly ? (
                <TableCell>
                  <Button
                    design="Transparent"
                    icon="overflow"
                    accessibleName={t("common.actions")}
                    disabled={mutationBusy}
                    onClick={(event) => {
                      setActionKey(row.key);
                      setActionOpener(opener(event));
                    }}
                  />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </Table>
      ) : loaded ? (
        <div className="controlObjectiveAccountGroupEmpty">
          {t("controlObjectiveAccountGroup.empty")}
        </div>
      ) : null}

      {!readOnly ? (
        <ActionSheet
          open={Boolean(action && actionOpener)}
          opener={actionOpener}
          placement="Bottom"
          horizontalAlign="End"
          headerText={t("common.actions")}
          onClose={closeActions}
        >
          {action && action.editState !== "FINAL" ? (
            <Button icon="undo" onClick={() => run(() => undo(action))}>
              {t("controlObjectiveAccountGroup.actions.undo")}
            </Button>
          ) : (
            <>
              {action && permissions.update ? (
                <Button icon="edit" onClick={() => run(() => setEditKey(action.key))}>
                  {t("controlObjectiveAccountGroup.actions.edit")}
                </Button>
              ) : null}
              {action?.original && permissions.lifecycle && action.status === "ACTIVE" ? (
                <Button icon="pause" onClick={() => run(() => setLifecycle(action, "INACTIVE"))}>
                  {t("controlObjectiveAccountGroup.actions.inactivate")}
                </Button>
              ) : null}
              {action?.original && permissions.lifecycle && action.status === "INACTIVE" ? (
                <Button icon="accept" onClick={() => run(() => setLifecycle(action, "ACTIVE"))}>
                  {t("controlObjectiveAccountGroup.actions.activate")}
                </Button>
              ) : null}
              {action && permissions.delete ? (
                <Button icon="delete" onClick={() => run(() => remove(action))}>
                  {t("controlObjectiveAccountGroup.actions.delete")}
                </Button>
              ) : null}
            </>
          )}
        </ActionSheet>
      ) : null}

      <ControlObjectiveAccountGroupSelectionDialog
        open={selectOpen}
        options={options}
        rows={rows}
        deletedAccountGroupIds={deletedAccountGroupIds}
        busy={mutationBusy}
        canCreate={permissions.create}
        canDelete={permissions.delete}
        canRestore={permissions.restore}
        onClose={() => setSelectOpen(false)}
        onConfirm={confirmSelection}
      />
      <ControlObjectiveClassificationValidityDialog
        open={Boolean(editing)}
        row={editing}
        busy={mutationBusy}
        onClose={() => setEditKey(null)}
        onSave={saveValidity}
      />
    </section>
  );
}

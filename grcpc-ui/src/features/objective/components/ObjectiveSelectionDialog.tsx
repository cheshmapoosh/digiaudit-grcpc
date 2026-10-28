import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HierarchyMultiSelectionDialog, type HierarchySelectionNode } from '@/shared/components/HierarchyMultiSelectionDialog';
import type { Objective } from '../domain/objective.model';

export default function ObjectiveSelectionDialog({ open, items, selectableIds, selectedIds, busy, onConfirm, onClose,
  loading = false, error, nodes: suppliedNodes }: {
  open: boolean; items?: Objective[]; selectableIds?: ReadonlySet<string>; selectedIds: Set<string>;
  nodes?: HierarchySelectionNode[];
  busy: boolean; loading?: boolean; error?: string | null; onConfirm: (ids: Set<string>) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const nodes = useMemo(() => suppliedNodes ?? (items ?? []).map(item => ({ id: item.id, parentId: item.parentObjectiveId,
    code: item.code, name: item.name, selectable: item.kind === 'OBJECTIVE' && item.status === 'ACTIVE'
      && Boolean(selectableIds?.has(item.id)) })), [items, selectableIds, suppliedNodes]);
  return <HierarchyMultiSelectionDialog open={open} title={t('objective.selection.title')}
    searchAccessibleName={t('objective.selection.search')} nodes={nodes} selectedIds={selectedIds} busy={busy}
    loading={loading} error={error} description={t('objective.selection.help')}
    confirmText={t('catalogRelation.select')} cancelText={t('common.cancel')}
    onConfirm={onConfirm} onClose={onClose} />;
}

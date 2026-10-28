import { OrganizationObjectiveRelations } from './OrganizationObjectiveRelations';
import type { OrganizationObjective, OrganizationObjectiveChange } from '../domain/objective.model';

export default function OrganizationObjectivesTab({ organizationId, manage, busy, changes = [], onChangesChange,
  onDirtyChange, onReadinessChange, resetKey, canonicalRows }: {
  organizationId: string | null; manage: boolean; busy?: boolean;
  changes?: OrganizationObjectiveChange[];
  onChangesChange?: (changes: OrganizationObjectiveChange[]) => void;
  onDirtyChange?: (dirty: boolean) => void; onReadinessChange?: (ready: boolean) => void;
  resetKey?: string | number; canonicalRows?: OrganizationObjective[];
}) {
  return <OrganizationObjectiveRelations side="organization" ownerId={organizationId} manage={manage}
    busy={busy} changes={changes} onChangesChange={onChangesChange ?? (() => undefined)}
    onDirtyChange={onDirtyChange} onReadinessChange={onReadinessChange} resetKey={resetKey} canonicalRows={canonicalRows} />;
}

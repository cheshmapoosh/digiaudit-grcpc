import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BusyIndicator,
  Link,
  MessageStrip,
  ObjectStatus,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Title,
} from "@ui5/webcomponents-react";
import { formatPersianDate } from "@/shared/utils/date.utils";
import type { ControlObjectiveAccountGroupClassification } from "../domain/controlObjectiveAccountGroup.model";
import { controlObjectiveAccountGroupApi } from "../infra/controlObjectiveAccountGroup.api";
import {
  useControlObjectiveAccountGroupPermissions,
  useControlObjectiveClassificationDestinationPermissions,
} from "../security/controlObjectiveAccountGroupPermissions";
import { controlObjectiveAccountGroupErrorMessage } from "../utils/controlObjectiveAccountGroupError";
import "../control-objective-account-group.css";

export default function AccountGroupControlObjectivesTab({
  accountGroupId,
  allowControlObjectiveNavigation = true,
}: {
  accountGroupId: string;
  allowControlObjectiveNavigation?: boolean;
}) {
  const { t } = useTranslation();
  const permissions = useControlObjectiveAccountGroupPermissions();
  const destinations = useControlObjectiveClassificationDestinationPermissions();
  const [rows, setRows] = useState<ControlObjectiveAccountGroupClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (!permissions.view) return () => controller.abort();
    void controlObjectiveAccountGroupApi.forAccountGroup(accountGroupId, controller.signal)
      .then(setRows)
      .catch((cause) => {
        if (!(cause instanceof Error && cause.name === "AbortError")) {
          setError(controlObjectiveAccountGroupErrorMessage(cause, t));
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [accountGroupId, permissions.view, t]);

  if (!permissions.view) {
    return <MessageStrip design="Information">{t("controlObjectiveAccountGroup.errors.forbidden")}</MessageStrip>;
  }
  return (
    <section className="controlObjectiveAccountGroupTab">
      <Title level="H5">{t("controlObjectiveAccountGroup.inverse.title")}</Title>
      {error ? <MessageStrip design="Negative">{error}</MessageStrip> : null}
      {loading ? <BusyIndicator active delay={0} /> : rows.length ? (
        <Table headerRow={(
          <TableHeaderRow>
            <TableHeaderCell>{t("controlObjectiveAccountGroup.fields.controlObjective")}</TableHeaderCell>
            <TableHeaderCell>{t("controlObjectiveAccountGroup.fields.validFrom")}</TableHeaderCell>
            <TableHeaderCell>{t("controlObjectiveAccountGroup.fields.validTo")}</TableHeaderCell>
            <TableHeaderCell>{t("controlObjectiveAccountGroup.fields.status")}</TableHeaderCell>
          </TableHeaderRow>
        )}>
          {rows.map((row) => (
            <TableRow key={row.classificationId} rowKey={row.classificationId}>
              <TableCell>
                {allowControlObjectiveNavigation && destinations.controlObjectiveView ? (
                  <Link
                    href={`/control-objectives/${row.controlObjectiveId}`}
                    wrappingType="Normal"
                  >
                    {`${row.controlObjectiveCode} — ${row.controlObjectiveTitle}`}
                  </Link>
                ) : `${row.controlObjectiveCode} — ${row.controlObjectiveTitle}`}
              </TableCell>
              <TableCell>{formatPersianDate(row.validFrom)}</TableCell>
              <TableCell>{formatPersianDate(row.validTo)}</TableCell>
              <TableCell>
                <ObjectStatus state={row.status === "ACTIVE" ? "Positive" : "None"}>
                  {t(`controlObjectiveAccountGroup.status.${row.status}`)}
                </ObjectStatus>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      ) : (
        <div className="controlObjectiveAccountGroupEmpty">
          {t("controlObjectiveAccountGroup.inverse.empty")}
        </div>
      )}
    </section>
  );
}

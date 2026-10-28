import { ObjectStatus } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import type { DatasetProfile } from "../domain/profile.model";

export default function ProfileStatus({ status }: { status: DatasetProfile["status"] }) {
  const { t } = useTranslation();
  return <ObjectStatus state={status === "ACTIVE" ? "Positive" : status === "DELETED" ? "Negative" : "Critical"}>
    {t(`profile.status.${status}`)}
  </ObjectStatus>;
}

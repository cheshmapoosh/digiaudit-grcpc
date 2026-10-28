import { Label, Text, Title } from "@ui5/webcomponents-react";
import type { ReactNode } from "react";
import "./masterDataObjectHeader.css";

type HeaderField = { label: string; value: string };

export function MasterDataObjectHeader({ title, fields, columns = 3 }: {
  title: string;
  fields: HeaderField[];
  columns?: 2 | 3;
}) {
  return <div className="masterDataObjectHeader">
    <Title level="H4">{title}</Title>
    <div className={columns === 2 ? "masterDataObjectHeaderGrid modalTwoColumnGrid" : "masterDataObjectHeaderGrid"}>
      {fields.map(({ label, value }) => <div className="masterDataObjectHeaderField" key={label}>
        <Label showColon>{label}</Label>
        <Text className="objectPageValue">{value || "—"}</Text>
      </div>)}
    </div>
  </div>;
}

export function MasterDataFormField({ label, required, wide = false, children }: {
  label: string;
  required?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return <div className={wide ? "masterDataFormField masterDataFormFieldWide" : "masterDataFormField"}>
    <Label showColon required={required}>{label}</Label>
    {children}
  </div>;
}

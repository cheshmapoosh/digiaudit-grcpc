import "./DigiAuditBrand.css";

type Props = { light?: boolean; compact?: boolean; markOnly?: boolean };

export default function DigiAuditBrand({ light = false, compact = false, markOnly = false }: Props) {
    return (
        <div className={`digiAuditBrand${light ? " digiAuditBrand--light" : ""}${compact ? " digiAuditBrand--compact" : ""}${markOnly ? " digiAuditBrand--markOnly" : ""}`} dir="ltr" aria-label="Digi Audit">
            <img src={light ? "/images/digi-audit-mark-light.svg" : "/images/digi-audit-mark.svg"} alt="" aria-hidden="true" />
            {!markOnly && <span>DIGI <strong>AUDIT</strong></span>}
        </div>
    );
}

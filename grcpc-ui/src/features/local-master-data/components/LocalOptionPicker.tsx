import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Label, MessageStrip, Option, Select } from "@ui5/webcomponents-react";
import { localApi } from "../infra/local.api.repo";
import type { LocalOption, LocalPage } from "../domain/local.model";

interface Props {
    label: string;
    path: string | null;
    params?: Record<string, string | number | null | undefined>;
    value: string | null;
    currentLabel?: string | null;
    required?: boolean;
    disabled?: boolean;
    searchable?: boolean;
    onChange: (id: string | null) => void;
}

function optionLabel(option: LocalOption): string {
    const label = option.displayLabel ?? option.definitionLabel
        ?? option.subprocessLabel ?? option.controlLabel ?? option.riskTemplateLabel
        ?? option.controlObjectiveLabel ?? option.requirementLabel
        ?? [option.leftDefinitionCode, option.rightDefinitionCode].filter(Boolean).join(" — ");
    const code = option.code ?? option.definitionCode ?? option.subprocessCode
        ?? option.controlCode ?? option.riskTemplateCode ?? option.controlObjectiveCode
        ?? option.requirementCode;
    return code ? `${code} — ${label}` : label || option.id;
}

export default function LocalOptionPicker({
    label, path, params, value, currentLabel, required, disabled, searchable = true, onChange,
}: Props) {
    const { t } = useTranslation();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [result, setResult] = useState<LocalPage<LocalOption> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const parameterKey = JSON.stringify(params ?? {});
    const stableParams = useMemo(
        () => JSON.parse(parameterKey) as Record<string, string | number | null | undefined>,
        [parameterKey],
    );

    useEffect(() => {
        if (!path) {
            queueMicrotask(() => setResult(null));
            return;
        }
        let active = true;
        queueMicrotask(() => { if (active) setLoading(true); });
        void localApi.options(path, { ...stableParams, q: search, page, size: 25 })
            .then((data) => {
                if (!active) return;
                setResult(data);
                setError(null);
            })
            .catch((cause: unknown) => {
                if (!active) return;
                setError(cause instanceof Error ? cause.message
                    : t("local.errors.options", { defaultValue: "گزینه‌ها بارگذاری نشدند." }));
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [path, stableParams, search, page, t]);

    const items = result?.items ?? [];
    const selectedAvailable = items.some((item) => item.id === value);
    const selectedLabel = selectedAvailable ? null : currentLabel;
    return <div style={{ display: "grid", gap: "0.3rem", minWidth: 0 }}>
        <Label required={required}>{label}</Label>
        {searchable ? <Input value={search} disabled={disabled || !path} maxlength={100}
            accessibleName={t("local.options.search", { defaultValue: "جستجوی گزینه" })}
            placeholder={t("local.options.search", { defaultValue: "جستجوی گزینه" })}
            onInput={(event) => { setSearch(event.target.value); setPage(0); }} /> : null}
        <Select value={value ?? ""} disabled={disabled || !path || loading}
            accessibleName={label}
            onChange={(event) => onChange(event.target.value || null)}>
            <Option value="">{t("local.options.none", { defaultValue: "انتخاب نشده" })}</Option>
            {selectedLabel && value ? <Option value={value}>{selectedLabel}</Option> : null}
            {items.map((item) => <Option key={item.id} value={item.id}>{optionLabel(item)}</Option>)}
        </Select>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <Button design="Transparent" disabled={disabled || page === 0 || loading}
                onClick={() => setPage((current) => current - 1)}>
                {t("local.options.previous", { defaultValue: "قبلی" })}
            </Button>
            <span>{result ? `${result.page + 1} / ${Math.max(1, result.totalPages)}` : "—"}</span>
            <Button design="Transparent" disabled={disabled || loading || !result
                || page + 1 >= result.totalPages}
                onClick={() => setPage((current) => current + 1)}>
                {t("local.options.next", { defaultValue: "بعدی" })}
            </Button>
        </div>
        {loading ? <MessageStrip design="Information" hideCloseButton>
            {t("local.loading", { defaultValue: "در حال بارگذاری..." })}
        </MessageStrip> : null}
        {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
        {value && !selectedAvailable && !selectedLabel && !loading
            ? <MessageStrip design="Critical" hideCloseButton>
                {t("local.options.ineligible", { defaultValue: "مرجع انتخاب‌شده اکنون واجد شرایط نیست." })}
            </MessageStrip> : null}
    </div>;
}

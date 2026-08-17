# AGENTS.md — Central Control UI

This file applies to `grcpc-ui/src/features/control`.

Use `grcpc-docs/master-data/accepted-corrections/2026-08-17-central-control-design.md` as the authoritative accepted correction for this feature.

## Durable UX rules

- Present Control Group and Control in one mixed hierarchy, following the established Policy Group/Policy interaction pattern without creating a generic catalog framework.
- Control Group is categorization only. Group may nest under Group; Control is categorized by one Group in the current UI. Existing ungrouped controls remain readable for upgrade compatibility.
- Control Group modals use the same object-summary header pattern as Policy Group modals.
- Create menu always renders both `گروه کنترل` and `کنترل`; invalid choices are disabled. No selection enables Group only; Group selection enables Group and Control; Control selection creates siblings in the selected Control's group context.
- Parent/group changes happen inside Edit through Value Help. Do not add a separate Move button.
- Control tab order is: `اطلاعات کلی`, `زیرفرآیندها`, `قوانین`, `الزام‌ها`, `ریسک‌ها`, `گروه حساب‌ها`, `مستندات`.
- Only `اطلاعات کلی` and `مستندات` are interactive in this slice. All relation tabs remain visible but disabled.
- Do not show `برنامه عملکرد`.
- Use the exact Persian labels `حوزه‌های کنترلی`, `محرک اجرا`, `شرح رخداد`, and `تناوب اجرا`.
- Render `حوزه‌های کنترلی` with UI5 `MultiComboBox`; keep it full-row and use application-translated select-all/clear-selection actions instead of exposing untranslated built-in UI5 text.
- `شرح رخداد` is enabled only when `محرک اجرا = رخداد`; `تناوب اجرا` is enabled only for the date/time trigger.
- Keep the shared `DocumentManager` in the Documents tab. It owns the temp-upload/finalize-on-parent-save flow and uses UI5 `FileUploader`.
- Show Test Plan disabled in this slice. Do not persist a placeholder or free-text value.
- Show system-owned `تاریخ ایجاد` read-only, plus editable `تاریخ اعتبار از` and `تاریخ اعتبار تا`; render the two validity dates in one desktop form row and do not introduce a generic `تاریخ اعتبار` field.
- A closed Control/Control Group dialog must not keep a mounted draft that can report stale dirty state. Remount object content per modal type/mode/entity as Policy does.
- Do not implement Control relations to Subprocess, Regulation, Requirement, Risk, or Account Group yet.

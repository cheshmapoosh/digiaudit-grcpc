import { useEffect, useRef } from "react";

/** Reserve measured dialog chrome so growing rows scroll before the modal exceeds 70% of the viewport. */
export function useOrganizationTableViewport() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const frame = ref.current;
        const dialog = frame?.closest<HTMLElement>("ui5-dialog");
        const content = dialog?.querySelector<HTMLElement>(".organizationObjectDialogContent");
        if (!frame || !dialog || !content) return;
        let animation = 0;
        const measure = () => {
            const frameBounds = frame.getBoundingClientRect();
            if (!frameBounds.width) return; // Inactive tabs remain mounted with their drafts.
            const header = dialog.querySelector<HTMLElement>(":scope > [slot='header']");
            const footer = dialog.querySelector<HTMLElement>(":scope > [slot='footer']");
            if (header) observer.observe(header);
            if (footer) observer.observe(footer);
            const headerBounds = header?.getBoundingClientRect();
            const contentBounds = content.getBoundingClientRect();
            // UI5's native content has symmetric block padding; measure it without touching shadow DOM.
            const padding = Math.max(0, contentBounds.top - (headerBounds?.bottom ?? dialog.getBoundingClientRect().top));
            const chrome = (headerBounds?.height ?? 0) + (footer?.getBoundingClientRect().height ?? 0)
                + contentBounds.height - frameBounds.height + padding * 2;
            const viewport = window.visualViewport?.height ?? window.innerHeight;
            const minimum = parseFloat(getComputedStyle(document.documentElement).fontSize) * 4;
            const height = Math.floor(Math.max(minimum, viewport * 0.7 - chrome - 2));
            const value = `${height}px`;
            if (frame.style.getPropertyValue("--organization-table-height") !== value) {
                frame.style.setProperty("--organization-table-height", value);
            }
        };
        const schedule = () => {
            cancelAnimationFrame(animation);
            animation = requestAnimationFrame(measure);
        };
        const observer = new ResizeObserver(schedule);
        [dialog, content, frame].forEach((element) => observer.observe(element));
        // The footer is portaled after the form mounts.
        const children = new MutationObserver(schedule);
        children.observe(dialog, { childList: true });
        window.addEventListener("resize", schedule);
        window.visualViewport?.addEventListener("resize", schedule);
        schedule();
        return () => {
            cancelAnimationFrame(animation);
            observer.disconnect();
            children.disconnect();
            window.removeEventListener("resize", schedule);
            window.visualViewport?.removeEventListener("resize", schedule);
        };
    }, []);
    return ref;
}

import { useEffect, useRef } from "react";

/** Divide the remaining native dialog content budget between its visible table frames. */
export function useCatalogTableViewport() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const frame = ref.current;
        const dialog = frame?.closest<HTMLElement>("ui5-dialog");
        const content = frame?.closest<HTMLElement>("[data-catalog-dialog-content]");
        if (!frame || !dialog || !content) return;
        let animation = 0;
        const measure = () => {
            if (!frame.getBoundingClientRect().width || !frame.getClientRects().length) return;
            const frames = Array.from(content.querySelectorAll<HTMLElement>("[data-catalog-table-viewport]"))
                .filter(item => item.getBoundingClientRect().width > 0 && item.getClientRects().length > 0);
            if (!frames.length) return;
            const header = dialog.querySelector<HTMLElement>(":scope > [slot='header']");
            const footer = dialog.querySelector<HTMLElement>(":scope > [slot='footer']");
            if (header) observer.observe(header);
            if (footer) observer.observe(footer);
            const contentBounds = content.getBoundingClientRect();
            const padding = Math.max(0, contentBounds.top - (header?.getBoundingClientRect().bottom ?? dialog.getBoundingClientRect().top));
            const tableHeight = frames.reduce((sum, item) => sum + item.getBoundingClientRect().height, 0);
            const chrome = (header?.getBoundingClientRect().height ?? 0) + (footer?.getBoundingClientRect().height ?? 0)
                + Math.max(0, contentBounds.height - tableHeight) + padding * 2;
            const viewport = window.visualViewport?.height ?? window.innerHeight;
            const minimum = parseFloat(getComputedStyle(document.documentElement).fontSize) * 4;
            const height = `${Math.floor(Math.max(minimum, (viewport * 0.7 - chrome - 2) / frames.length))}px`;
            for (const item of frames) if (item.style.getPropertyValue("--catalog-table-height") !== height)
                item.style.setProperty("--catalog-table-height", height);
        };
        const schedule = () => { cancelAnimationFrame(animation); animation = requestAnimationFrame(measure); };
        const observer = new ResizeObserver(schedule);
        [dialog, content, frame].forEach(element => observer.observe(element));
        const children = new MutationObserver(schedule);
        children.observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "style"] });
        children.observe(dialog, { childList: true });
        window.addEventListener("resize", schedule);
        window.visualViewport?.addEventListener("resize", schedule);
        schedule();
        return () => {
            cancelAnimationFrame(animation); observer.disconnect(); children.disconnect();
            window.removeEventListener("resize", schedule);
            window.visualViewport?.removeEventListener("resize", schedule);
        };
    }, []);
    return ref;
}

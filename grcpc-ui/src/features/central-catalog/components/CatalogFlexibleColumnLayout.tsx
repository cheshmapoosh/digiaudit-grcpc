import { Children, createElement, Fragment, type ReactNode } from "react";

import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

interface CatalogFlexibleColumnLayoutProps {
  children: ReactNode;
}

function column(
  slot: "startColumn" | "midColumn" | "endColumn",
  content: ReactNode,
) {
  return createElement(
    "div",
    {
      slot,
      className: "catalogFclColumn",
    },
    content,
  );
}

export function CatalogFlexibleColumnLayout({
  children,
}: CatalogFlexibleColumnLayoutProps) {
  const [start, middle, ...remaining] = Children.toArray(children);
  const end = remaining.length
    ? createElement(Fragment, null, ...remaining)
    : undefined;
  const layout = end
    ? "ThreeColumnsMidExpanded"
    : middle
      ? "TwoColumnsStartExpanded"
      : "OneColumn";

  return createElement(
    "ui5-flexible-column-layout",
    {
      layout,
      "disable-resizing": true,
      className: "catalogFcl",
    },
    column("startColumn", start),
    middle ? column("midColumn", middle) : null,
    end ? column("endColumn", end) : null,
  );
}

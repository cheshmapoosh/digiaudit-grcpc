import { RouterProvider } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { appRouter } from "./router/AppRouter.tsx";

export default function App() {
    const { t, i18n } = useTranslation();
    useEffect(() => {
        document.title = t("brand.browserTitle");
    }, [i18n.language, t]);
    return (
        <RouterProvider router={appRouter} />
    );
}

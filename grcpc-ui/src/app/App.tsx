import {BrowserRouter} from "react-router-dom";
import AppRouter from "./router/AppRouter.tsx";
import AppToast from "@/shared/components/AppToast";
import SessionExpiredRedirector from "@/features/auth/components/SessionExpiredRedirector";

export default function App() {
    return (
        <BrowserRouter
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
            }}
        >
            <div>
                <SessionExpiredRedirector />
                <AppRouter/>
                <AppToast/>
            </div>
        </BrowserRouter>
    );
}

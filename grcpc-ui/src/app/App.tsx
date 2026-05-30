import {BrowserRouter} from "react-router-dom";
import AppRouter from "./router/AppRouter.tsx";
import AppToast from "@/shared/components/AppToast";

export default function App() {
    return (
        <BrowserRouter
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
            }}
        >
            <div>
                <AppRouter/>
                <AppToast/>
            </div>
        </BrowserRouter>
    );
}

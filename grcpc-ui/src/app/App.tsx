import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router/AppRouter.tsx";

export default function App() {
    return (
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
    );
}

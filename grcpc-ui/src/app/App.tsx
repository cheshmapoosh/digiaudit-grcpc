import { RouterProvider } from "react-router-dom";
import { appRouter } from "./router/AppRouter.tsx";

export default function App() {
    return (
        <RouterProvider router={appRouter} />
    );
}

import { Route } from "react-router-dom";
import AccountGroupsFclShellPage from "./pages/AccountGroupsFclShellPage";

export const accountGroupRoutes = (
    <>
        <Route path="/account-groups" element={<AccountGroupsFclShellPage />} />
        <Route path="/account-groups/new" element={<AccountGroupsFclShellPage />} />
        <Route path="/account-groups/:accountGroupId" element={<AccountGroupsFclShellPage />} />
        <Route path="/account-groups/:accountGroupId/edit" element={<AccountGroupsFclShellPage />} />
    </>
);

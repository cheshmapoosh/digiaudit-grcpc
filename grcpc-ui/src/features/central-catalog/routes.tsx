import { Route } from "react-router-dom";
import CentralCatalogPage from "./pages/CentralCatalogPage";
export const centralCatalogRoutes = <>
    <Route path="/controls" element={<CentralCatalogPage family="control" />} />
    <Route path="/control-objectives" element={<CentralCatalogPage family="control" initialKind="controlObjectives" />} />
    <Route path="/risks" element={<CentralCatalogPage family="risk" />} />
    <Route path="/account-groups" element={<CentralCatalogPage family="accountGroup" />} />
    <Route path="/regulations" element={<CentralCatalogPage family="regulation" />} />
    <Route path="/policies" element={<CentralCatalogPage family="policy" />} />
</>;

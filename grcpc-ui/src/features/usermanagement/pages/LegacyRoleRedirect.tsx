import { Navigate, useParams } from "react-router-dom";

export default function LegacyRoleRedirect() {
  const { roleId } = useParams<{ roleId: string }>();
  return <Navigate to={roleId ? `/access-control/roles/${roleId}` : "/access-control/roles"} replace />;
}

import { Title, Button } from "@ui5/webcomponents-react";
import { useNavigate } from "react-router-dom";

export default function RolesListPage() {
    const navigate = useNavigate();
    return (
        <div style={{ padding: 16 }}>
            <Title level="H3">Roles</Title>
            <p>لیست نقش‌ها اینجاست (بعداً Table می‌گذاریم).</p>

            <Button design="Emphasized" onClick={() => navigate("/access-control/roles/ADMIN")}>
                Open Role ADMIN
            </Button>
        </div>
    );
}

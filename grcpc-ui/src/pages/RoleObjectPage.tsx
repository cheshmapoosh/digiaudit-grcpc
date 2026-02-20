import { Title } from "@ui5/webcomponents-react";
import { useParams } from "react-router-dom";

export default function RoleObjectPage() {
    const { roleId } = useParams();
    return (
        <div style={{ padding: 16 }}>
            <Title level="H3">Role: {roleId}</Title>
            <p>این صفحه بعداً ObjectPage می‌شود.</p>
        </div>
    );
}

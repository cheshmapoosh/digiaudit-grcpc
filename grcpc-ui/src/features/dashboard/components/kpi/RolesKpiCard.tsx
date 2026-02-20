import { Card, CardHeader, FlexBox, FlexBoxDirection, Icon, Text } from "@ui5/webcomponents-react";

type Props = {
    value: number;
    onPress?: () => void;
};

export default function RolesKpiCard({ value, onPress }: Props) {
    return (
        <Card
            header={<CardHeader titleText="Roles" subtitleText="Access Control" />}
            onClick={onPress}
            style={{ cursor: onPress ? "pointer" : "default" }}
        >
            <div style={{ padding: 16 }}>
                <FlexBox direction={FlexBoxDirection.Row} style={{ alignItems: "baseline", gap: 8 }}>
                    <Text style={{ fontSize: 32, fontWeight: 700 }}>{value}</Text>
                    <Text style={{ opacity: 0.7 }}>Total</Text>
                </FlexBox>

                <FlexBox direction={FlexBoxDirection.Row} style={{ marginTop: 8, gap: 6, alignItems: "center" }}>
                    <Icon name="trend-up" />
                    <Text style={{ opacity: 0.8 }}>Up</Text>
                </FlexBox>
            </div>
        </Card>
    );
}

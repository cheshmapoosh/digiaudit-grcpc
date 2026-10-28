import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    Button,
    Card,
    CardHeader,
    Text,
    Title,
} from "@ui5/webcomponents-react";

export default function NotFoundPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div
            style={{ minHeight: "calc(100vh - 3rem)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}
        >
            <Card
                style={{ width: "100%", maxWidth: "540px" }}
                header={
                    <CardHeader
                        titleText={t("common.notFound.pageTitle", {
                            defaultValue: "صفحه مورد نظر یافت نشد",
                        })}
                        subtitleText={t("common.notFound.pageSubtitle", {
                            defaultValue: "مسیر درخواستی معتبر نیست",
                        })}
                    />
                }
            >
                <div
                    style={{
                        padding: "1.5rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        alignItems: "flex-start",
                    }}
                >
                    <Title level="H4">
                        {t("common.notFound.title", {
                            defaultValue: "آدرس واردشده معتبر نیست",
                        })}
                    </Title>

                    <Text>
                        {t("common.notFound.description", {
                            defaultValue: "صفحه‌ای که درخواست کرده‌اید وجود ندارد یا مسیر آن تغییر کرده است.",
                        })}
                    </Text>

                    <Button design="Emphasized" onClick={() => navigate("/dashboard", { replace: true })}>
                        {t("common.notFound.actions.backToDashboard", {
                            defaultValue: "بازگشت به داشبورد",
                        })}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
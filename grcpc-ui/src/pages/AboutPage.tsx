import { Card, CardHeader, FlexBox, Grid, Icon, Label, Text, Title } from "@ui5/webcomponents-react";
import { useTranslation } from "react-i18next";
import { useAppVersion } from "@/shared/hooks/useAppVersion";
import "./about.css";

const SECTIONS = [
  { key: "organization", icon: "org-chart" },
  { key: "risks", icon: "alert" },
  { key: "controls", icon: "shield" },
  { key: "regulations", icon: "document-text" },
  { key: "documents", icon: "documents" },
  { key: "access", icon: "key-user-settings" },
] as const;

export default function AboutPage() {
  const { t } = useTranslation();
  const version = useAppVersion();

  return (
    <FlexBox as="section" direction="Column" className="aboutPage" aria-labelledby="about-page-title">
      <Title id="about-page-title" level="H1" size="H3">{t("nav.about")}</Title>

      <Card accessibleName={t("about.platformTitle")}>
        <FlexBox wrap="Wrap" alignItems="Center" className="aboutHero">
          <FlexBox direction="Column" className="aboutHeroCopy">
            <img className="aboutBrandImage" src="/images/digi-grc-reference-navigation-logo.png"
              alt={t("brand.referenceLogoAlt")} />
            <Title level="H2" size="H3" wrappingType="Normal">{t("about.platformTitle")}</Title>
            <Text>{t("about.introduction")}</Text>
            <FlexBox alignItems="Center" className="aboutVersion">
              <Label showColon>{t("about.version")}</Label>
              <Text dir="ltr">{version}</Text>
            </FlexBox>
          </FlexBox>
          <img className="aboutHeroImage" src="/images/digi-audit-login-hero-wide.png"
            alt={t("about.imageAlt")} />
        </FlexBox>
      </Card>

      <Title level="H2" size="H4">{t("about.capabilities")}</Title>
      <Grid defaultSpan="XL4 L4 M6 S12" className="aboutSections">
        {SECTIONS.map(section => (
          <Card key={section.key} className="aboutSectionCard" accessibleName={t(`about.${section.key}.title`)}
            header={<CardHeader titleText={t(`about.${section.key}.title`)}
              avatar={<Icon name={section.icon} design="Neutral" mode="Decorative" />} />}>
            <FlexBox direction="Column" className="aboutSectionBody">
              <Text>{t(`about.${section.key}.description`)}</Text>
            </FlexBox>
          </Card>
        ))}
      </Grid>
    </FlexBox>
  );
}

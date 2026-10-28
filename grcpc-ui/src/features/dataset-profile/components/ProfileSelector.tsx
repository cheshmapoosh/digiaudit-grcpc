import { useAuthState } from "@/features/auth";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, FlexBox, List, ListItemCustom, MessageStrip, ObjectStatus, Popover, Text } from "@ui5/webcomponents-react";
import { useProfileState } from "../state/profile.state";
import { preferredProfileId, selectedProfileId, storeProfileSelection } from "@/shared/infra/profileSelection";
import ProfileAvatar from "./ProfileAvatar";
import "../profile.css";

export default function ProfileSelector({ slot }: { slot?: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profiles, loaded, loading, userId, error, load } = useProfileState();
  const [open, setOpen] = useState(false);
  const openerId = useId();
  const selected = profiles.find((p) => p.id === selectedProfileId());
  useEffect(() => {
    if (!useProfileState.getState().loaded) void load();
    const refresh = () => { void load(); void useAuthState.getState().refreshMe(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("grcpc:profile-access-changed", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("grcpc:profile-access-changed", refresh); };
  }, [load]);
  useEffect(() => {
    if (!loaded || loading || error || !userId) return;
    const requested = new URLSearchParams(location.search).get("datasetProfile");
    if (requested && profiles.some((p) => p.id === requested)) {
      // The router's unsaved-changes blocker has already accepted this scope change.
      storeProfileSelection(requested);
      window.location.replace("/master-data");
      return;
    }
    if (!selected) {
      const fallback = preferredProfileId(userId, profiles.map((profile) => profile.id));
      if (fallback) navigate(`/master-data?datasetProfile=${encodeURIComponent(fallback)}`, { replace: true });
    }
  }, [loaded, loading, error, userId, location.search, profiles, selected, navigate]);

  function showChoices() { setOpen((value) => !value); }

  return <FlexBox slot={slot} className="profileSelector" alignItems="Center" data-hide-order="100">
    {selected ? <List className="profileSelectorBox" accessibleName={t("profile.select")} onItemClick={showChoices}>
      <ListItemCustom id={openerId} type="Active" tooltip={selected.name}
        accessibleName={t("profile.selectCurrent", { name: selected.name })} aria-haspopup="dialog" aria-expanded={open}>
        <FlexBox alignItems="Center" className="profileSelectorIdentity">
          <ProfileAvatar profile={selected} />
          <Text maxLines={1}>{selected.name}</Text>
        </FlexBox>
      </ListItemCustom>
    </List> : <Button
      id={openerId}
      design="Transparent"
      disabled={!loaded && loading}
      accessibleName={t("profile.select")}
      accessibilityAttributes={{ hasPopup: "dialog", expanded: open ? "true" : "false" }}
      tooltip={t("profile.select")}
      onClick={showChoices}
    >{t(loading ? "profile.loading" : "profile.select")}</Button>}
    {typeof document !== "undefined" && createPortal(
      <Popover open={open} opener={openerId} headerText={t("profile.select")} placement="Bottom" horizontalAlign="End" onClose={() => setOpen(false)}>
        <FlexBox direction="Column" className="profileChoices">
          {error ? <MessageStrip design="Negative" hideCloseButton>{t("profile.loadError")}</MessageStrip> : null}
          {loaded && !error && profiles.length === 0 ? <MessageStrip design="Information" hideCloseButton>{t("profile.noAvailable")}</MessageStrip> : null}
          {error ? <Button disabled={loading} onClick={() => void load()}>{t("profile.retry")}</Button> : null}
          <List key={open ? "open" : "closed"} selectionMode="Single" accessibleName={t("profile.select")} onSelectionChange={(event) => {
            const id = event.detail.selectedItems[0]?.dataset.profileId;
            if (!id || !profiles.some((profile) => profile.id === id)) return;
            setOpen(false);
            if (id !== selected?.id) navigate(`/master-data?datasetProfile=${encodeURIComponent(id)}`);
          }}>
            {profiles.map((profile) => <ListItemCustom key={profile.id} type="Active" data-profile-id={profile.id} selected={profile.id === selected?.id}>
              <FlexBox alignItems="Center" gap="0.75rem" className="profileChoice">
                <ProfileAvatar profile={profile} />
                <FlexBox direction="Column" className="profileChoiceName">
                  <Text>{profile.name}</Text>
                  {profile.status === "INACTIVE" ? <ObjectStatus state="Critical">{t("profile.readOnly")}</ObjectStatus> : null}
                </FlexBox>
              </FlexBox>
            </ListItemCustom>)}
          </List>
        </FlexBox>
      </Popover>, document.body,
    )}
  </FlexBox>;
}

import { useSettingsForm } from "../hooks/useSettingsForm";
import { SectionHeader } from "../components/ui/SectionHeader";
import { ProfileSection } from "../components/settings/ProfileSection";
import { PreferencesSection } from "../components/settings/PreferencesSection";
import { AppearanceSection } from "../components/settings/AppearanceSection";
import { NotificationsSection } from "../components/settings/NotificationsSection";
import { PrivacySection } from "../components/settings/PrivacySection";
import { SessionSection } from "../components/settings/SessionSection";

export function SettingsPage() {
  const {
    name,
    setName,
    email,
    setEmail,
    timezone,
    setTimezone,
    weekStartsOn,
    setWeekStartsOn,
    timeFormat,
    setTimeFormat,
    theme,
    setTheme,
    notifications,
    toggleNotification,
    isProfileSaved,
    saveProfile,
  } = useSettingsForm();

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Configuración" description="Administra tu perfil, preferencias y notificaciones." />

      <ProfileSection
        name={name}
        email={email}
        isSaved={isProfileSaved}
        onNameChange={setName}
        onEmailChange={setEmail}
        onSave={saveProfile}
      />

      <PreferencesSection
        timezone={timezone}
        weekStartsOn={weekStartsOn}
        timeFormat={timeFormat}
        onTimezoneChange={setTimezone}
        onWeekStartsOnChange={setWeekStartsOn}
        onTimeFormatChange={setTimeFormat}
      />

      <AppearanceSection theme={theme} onThemeChange={setTheme} />

      <NotificationsSection notifications={notifications} onToggle={toggleNotification} />

      <PrivacySection />

      <SessionSection />
    </div>
  );
}

import { Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useSettingsForm } from "../hooks/useSettingsForm";
import { useTheme } from "../hooks/useTheme";
import { SectionHeader } from "../components/ui/SectionHeader";
import { ProfileSection } from "../components/settings/ProfileSection";
import { PreferencesSection } from "../components/settings/PreferencesSection";
import { AppearanceSection } from "../components/settings/AppearanceSection";
import { NotificationsSection } from "../components/settings/NotificationsSection";
import { PrivacySection } from "../components/settings/PrivacySection";
import { SessionSection } from "../components/settings/SessionSection";
import { CategoriesSection } from "../components/settings/CategoriesSection";

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
    notifications,
    toggleNotification,
    isProfileSaved,
    saveProfile,
  } = useSettingsForm();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={<SettingsIcon size={20} aria-hidden="true" />}
        title="Configuración"
        description="Administra tu perfil, preferencias y notificaciones."
      />

      <ProfileSection
        name={name}
        email={email}
        isSaved={isProfileSaved}
        onNameChange={setName}
        onEmailChange={setEmail}
        onSave={saveProfile}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PreferencesSection
          timezone={timezone}
          weekStartsOn={weekStartsOn}
          timeFormat={timeFormat}
          onTimezoneChange={setTimezone}
          onWeekStartsOnChange={setWeekStartsOn}
          onTimeFormatChange={setTimeFormat}
        />

        <AppearanceSection theme={theme} onThemeChange={setTheme} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <NotificationsSection notifications={notifications} onToggle={toggleNotification} />

        <PrivacySection />
      </div>

      <CategoriesSection />

      <SessionSection />

      <footer className="flex flex-col items-center justify-between gap-2 border-t border-border pt-4 text-xs text-text-disabled sm:flex-row">
        <p>© 2026 Habit Tracker. Todos los derechos reservados.</p>
        <p className="flex items-center gap-1.5">
          Versión 2.0.0
          <Sparkles size={12} aria-hidden="true" />
        </p>
      </footer>
    </div>
  );
}

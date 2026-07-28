import { useState } from "react";
import { mockUser } from "../data/mockUser";

export type TimeFormat = "12h" | "24h";

export interface NotificationPreferences {
  streakAtRisk: boolean;
  abandonedHabit: boolean;
  weeklySummary: boolean;
  reminders: boolean;
}

export function useSettingsForm() {
  const [name, setName] = useState(mockUser.name);
  const [email, setEmail] = useState(mockUser.email);
  const [timezone, setTimezone] = useState(mockUser.timezone);
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(mockUser.weekStartsOn);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("12h");
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    streakAtRisk: true,
    abandonedHabit: true,
    weeklySummary: true,
    reminders: false,
  });
  const [isProfileSaved, setIsProfileSaved] = useState(false);

  function toggleNotification(key: keyof NotificationPreferences, value: boolean) {
    setNotifications((current) => ({ ...current, [key]: value }));
  }

  function saveProfile() {
    setIsProfileSaved(true);
    setTimeout(() => setIsProfileSaved(false), 2000);
  }

  return {
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
  };
}

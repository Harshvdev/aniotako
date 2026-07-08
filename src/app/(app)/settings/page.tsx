import SettingsClient from "./SettingsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Customize your tracking preferences, preferred title language (English/Romaji), localized timezones, and browser push notification formats on Aniotako.",
  alternates: {
    canonical: "/settings",
  },
};

export default function SettingsPage() {
  return <SettingsClient />;
}
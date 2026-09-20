import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "Edit profile — Trench Socials" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <ProfileForm />
    </div>
  );
}

import { NavTab, NavTabs } from "@/client/components/NavTabs";

const tabs = [
  { to: "/p/$projectId/settings" as const, label: "General", exact: true },
  {
    to: "/p/$projectId/settings/integrations" as const,
    label: "Integraciones",
  },
];

export function SettingsTabs({ projectId }: { projectId: string }) {
  return (
    <NavTabs label="Secciones de ajustes del proyecto">
      {tabs.map((tab) => (
        <NavTab
          key={tab.to}
          to={tab.to}
          params={{ projectId }}
          activeOptions={{ exact: tab.exact ?? false }}
        >
          {tab.label}
        </NavTab>
      ))}
    </NavTabs>
  );
}

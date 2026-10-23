import { Text } from "react-native";

export type TabIconName =
  | "home"
  | "profile"
  | "skills"
  | "assessment"
  | "jobs"
  | "queue"
  | "history"
  | "discover"
  | "requests"
  | "overview"
  | "users"
  | "audit";

const NATIVE_ICONS: Record<TabIconName, string> = {
  home: "🏠",
  profile: "👤",
  skills: "🏆",
  assessment: "🧪",
  jobs: "💼",
  queue: "📋",
  history: "📅",
  discover: "🔍",
  requests: "📋",
  overview: "📊",
  users: "👥",
  audit: "📜",
};

export function TabIcon({ name, focused }: { name: TabIconName; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{NATIVE_ICONS[name]}</Text>;
}

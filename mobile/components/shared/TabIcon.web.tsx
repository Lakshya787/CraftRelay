import {
  Award,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardList,
  FlaskConical,
  House,
  Search,
  ScrollText,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { TabIconName } from "./TabIcon";

const WEB_ICONS = {
  home: House,
  profile: UserRound,
  skills: Award,
  assessment: FlaskConical,
  jobs: BriefcaseBusiness,
  queue: ClipboardList,
  history: CalendarDays,
  discover: Search,
  requests: ClipboardList,
  overview: ChartNoAxesColumn,
  users: UsersRound,
  audit: ScrollText,
} as const;

export function TabIcon({ name, focused }: { name: TabIconName; focused: boolean }) {
  const Icon = WEB_ICONS[name];
  return (
    <Icon
      size={20}
      strokeWidth={2.5}
      color={focused ? "#ff4d4d" : "#77736d"}
      aria-hidden="true"
      focusable="false"
    />
  );
}

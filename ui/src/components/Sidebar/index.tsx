import { useMantineColorScheme } from "@mantine/core";
import { IconAffiliate, IconBrightness } from "@tabler/icons-react";
import { NavLink } from "react-router-dom";
import {
  IconBulb,
  IconDashboard,
  IconFileImport,
  IconMessageLanguage,
  IconCube,
  IconMessages,
} from "@tabler/icons-react";

import styles from "./styles.module.css";

const MAIN_MENU_LINKS = [
  { link: "/", label: "Introduction", icon: IconBulb },
  { link: "/import-articles/", label: "Import articles", icon: IconFileImport },
  {
    link: "/natural-language-processing/",
    label: "Natural language processing",
    icon: IconMessageLanguage,
  },
  { link: "/enhance-entities/", label: "Enhance entities", icon: IconCube },
  { link: "/dashboard/", label: "Dashboard", icon: IconDashboard },
  { link: "/network-graph/", label: "Network graph", icon: IconAffiliate },
  { link: "/chat-agent/", label: "Chat agent", icon: IconMessages },
];

export function Sidebar() {
  const { setColorScheme, colorScheme } = useMantineColorScheme();

  const handleThemeChange = () => {
    setColorScheme(colorScheme === "dark" ? "light" : "dark");
  };

  const links = MAIN_MENU_LINKS.map((item) => (
    <NavLink
      className={({ isActive }) => (isActive ? styles.active : "")}
      to={item.link}
      key={item.label}
    >
      <item.icon className={styles.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </NavLink>
  ));

  return (
    <nav className={styles.navbar}>
      <div className={styles.links}>{links}</div>
      <div className={styles.toolbox}>
        <span onClick={handleThemeChange}>
          <IconBrightness />
        </span>
      </div>
    </nav>
  );
}

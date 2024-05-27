import { Outlet } from "react-router-dom";
import { Sidebar } from "../../components/Sidebar";
import { ScrollArea } from "@mantine/core";

import styles from "./styles.module.css";

export function BaseLayout() {
  return (
    <div className={styles.baseLayout}>
      <Sidebar />
      <main>
        <ScrollArea>
          <Outlet />
        </ScrollArea>
      </main>
    </div>
  );
}

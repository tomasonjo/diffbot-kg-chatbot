import { useQuery } from "@tanstack/react-query";
import { Dashboard } from "../components/Dashboard";
import { getDashboard } from "../api";

export function DashboardPage() {
    return (
        <Dashboard />
    )
}

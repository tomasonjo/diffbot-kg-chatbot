import { apiClient } from "./axios"

export async function getDashboard() {
    try {
        const response = await apiClient.get("/dashboard");
        console.log(response.data)
        return response.data;
    } catch (error) {
        console.log(error)
    }
}

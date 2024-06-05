import { apiClient } from "./axios";

export async function getDashboard() {
  try {
    const response = await apiClient.get("/dashboard/");
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

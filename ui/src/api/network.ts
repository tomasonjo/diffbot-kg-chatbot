import { apiClient } from "./axios";

export async function getNetwork() {
  try {
    const response = await apiClient.get("/fetch_network/");
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

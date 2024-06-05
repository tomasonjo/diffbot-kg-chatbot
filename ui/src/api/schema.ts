import { apiClient } from "./axios";

export async function refreshSchema() {
  try {
    const response = await apiClient.get("/refresh_schema/");
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

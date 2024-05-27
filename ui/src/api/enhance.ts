import { apiClient } from "./axios";

interface EnhanceKnowledgeGraphPayload {
  size: number;
}

export async function enhanceEntities(payload: EnhanceKnowledgeGraphPayload) {
  try {
    const response = await apiClient.post("/enhance_entities/", payload);
    return response.data;
  } catch (error) {
    console.log(error)
    throw error;
  }
}

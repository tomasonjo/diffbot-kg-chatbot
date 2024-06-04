import { apiClient } from "./axios";

interface UnprocessedEntitiesPayload {
  type: string;
}

interface EnhanceKnowledgeGraphPayload {
  size: number;
}

export async function getUnprocessedEntities(
  payload: UnprocessedEntitiesPayload,
) {
  try {
    const response = await apiClient.post("/unprocessed_count/", payload);

    return response.data;
  } catch (error) {
    console.log(error);
  }
}

export async function enhanceEntities(payload: EnhanceKnowledgeGraphPayload) {
  try {
    const response = await apiClient.post("/enhance_entities/", payload);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

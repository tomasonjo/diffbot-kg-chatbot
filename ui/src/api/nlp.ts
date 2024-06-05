import { apiClient } from "./axios";

export async function getUnprocessedArticles() {
  try {
    const response = await apiClient.post("/unprocessed_count/", {
      type: "articles",
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

export async function processArticles() {
  try {
    const response = await apiClient.get("/process_articles/");
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

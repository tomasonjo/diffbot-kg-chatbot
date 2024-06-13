export const RETRIEVAL_MODES = [
  {
    name: "basic_hybrid_search",
    label: "Vector only",
    endpoint: "chat",
  },
  {
    name: "basic_hybrid_search_node_neighborhood",
    label: "Vector + KG",
    endpoint: "chat",
  },
  {
    name: "graph_based_prefiltering",
    label: "Prefiltering",
    endpoint: "prefiltering",
  },
  {
    name: "text2cypher",
    label: "Text2Cypher",
    endpoint: "text2cypher",
  },
];

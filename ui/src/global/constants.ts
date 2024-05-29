export const RETRIEVAL_MODES = [
  {
    name: "basic_hybrid_search",
    label: "Basic hybrid search",
    endpoint: "chat",
  },
  {
    name: "basic_hybrid_search_node_neighborhood",
    label: "Basic hybrid + node neighborhood",
    endpoint: "chat",
  },
  {
    name: "graph_based_prefiltering",
    label: "Graph-based prefiltering",
    endpoint: "prefiltering",
  },
  {
    name: "text2cypher",
    label: "Text2Cypher",
    endpoint: "text2cypher",
  },
];

import "@mantine/core/styles.css";

import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { BaseLayout } from "./layouts/BaseLayout";
import { IntroductionPage } from "./pages/IntroductionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ChatAgentPage } from "./pages/ChatAgentPage";
import { ImportArticlesPage } from "./pages/ImportArticlesPage";
import { EnhanceEntitiesPage } from "./pages/EnhanceEntitiesPage";
import { NaturalLanguageProcessingPage } from "./pages/NaturalLanguageProcessingPage";
import { MantineProvider, createTheme } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Neo4jNetworkGraph } from "./components/NetworkGraph";

const theme = createTheme({
  components: {
    Input: {
      styles: () => ({
        input: {
          borderWidth: "2px",
        },
      }),
    },
    TextInput: {
      styles: () => ({
        input: {
          borderWidth: "2px",
        },
      }),
    },
    Select: {
      styles: () => ({
        input: {
          borderWidth: "2px",
        },
      }),
    },
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <BaseLayout />,
    children: [
      {
        path: "",
        element: <IntroductionPage />,
      },
      {
        path: "dashboard/",
        element: <DashboardPage />,
      },
      {
        path: "chat-agent/",
        element: <ChatAgentPage />,
      },
      {
        path: "enhance-entities/",
        element: <EnhanceEntitiesPage />,
      },
      {
        path: "import-articles/",
        element: <ImportArticlesPage />,
      },
      {
        path: "natural-language-processing/",
        element: <NaturalLanguageProcessingPage />,
      },
      {
        path: "network-graph/",
        element: <Neo4jNetworkGraph />,
      },
    ],
  },
]);

const queryClient = new QueryClient();

export function App() {
  return (
    <MantineProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  );
}

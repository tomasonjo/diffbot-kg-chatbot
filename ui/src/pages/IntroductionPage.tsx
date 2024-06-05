import { Box, Paper, Title, Text } from "@mantine/core";

export function IntroductionPage() {
  return (
    <Box p="lg">
      <Paper maw={640} mx="auto" shadow="xs" p="lg">
        <Title order={2}>Neo4j and Diffbot GraphRAG demo!</Title>
        <Text>Showcasing RAG approaches.</Text>
      </Paper>
    </Box>
  );
}

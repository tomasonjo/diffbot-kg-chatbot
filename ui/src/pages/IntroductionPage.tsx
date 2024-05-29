import { Box, Paper, Title } from "@mantine/core";

export function IntroductionPage() {
  return (
    <Box p="lg">
      <Paper maw={640} mx="auto" shadow="xs" p="lg">
        <Title order={2}>Neo4j and Diffbot GraphRAG demo!</Title>
      </Paper>
    </Box>
  );
}

import { Grid, Title, Text, Paper, Box, LoadingOverlay } from "@mantine/core";
import { BarChart } from "@mantine/charts";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../../api";

export function Dashboard() {
  const { isLoading, data, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  if (isLoading) {
    return (
      <LoadingOverlay
        visible={isLoading}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
    );
  }

  if (error) {
    return <>{error}</>;
  }

  return (
    <Box p="lg">
      <Paper maw={640} mx="auto" shadow="xs" p="lg">
        <Title order={2} mb="xl">
          Dashboard
        </Title>
        <Grid mb="xl">
          <Grid.Col span={6}>
            <Title order={5}>Number of articles</Title>
            <Text size="xl">{data.article.article_count}</Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Title order={5}>Number of entities</Title>
            <Text size="xl">{data.entity.count}</Text>
          </Grid.Col>
        </Grid>
        <Title order={5} mb="lg">
          Article sentiment
        </Title>
        <BarChart
          h={300}
          data={data.article.sentiment}
          dataKey="sentiment"
          series={[{ name: "count", color: "teal.6" }]}
          tickLine="x"
        />
        <Title order={5} mt="lg" mb="lg">
          Entity types
        </Title>
        <BarChart
          h={300}
          data={data.entity.types}
          dataKey="label"
          series={[{ name: "count", color: "teal.6" }]}
          tickLine="x"
        />
      </Paper>
    </Box>
  );
}

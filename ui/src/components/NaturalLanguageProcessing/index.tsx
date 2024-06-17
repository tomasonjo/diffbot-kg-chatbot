import {
  Button,
  Group,
  Paper,
  Title,
  Text,
  Box,
  Notification,
  rem,
  ActionIcon,
  LoadingOverlay,
  Alert,
} from "@mantine/core";
import { FormEvent, MouseEvent, useState } from "react";
import {
  IconCheck,
  IconInfoCircle,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { getUnprocessedArticles, processArticles } from "../../api/nlp";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function NaturalLanguageProcessing() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const queryUnprocessedArticles = useQuery({
    queryKey: ["unprocessed-articles"],
    queryFn: getUnprocessedArticles,
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: processArticles,
    onSuccess: (message: string) => {
      setSuccessMessage(message);
      queryClient.invalidateQueries({ queryKey: ["unprocessed-articles"] });
    },
    onError: () => {
      setErrorMessage("Failed to import articles.");
    },
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    mutation.mutate();
  };

  const handleProcessedArticlesCountRefresh = (
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    queryUnprocessedArticles.refetch();
  };

  const handleNotificationClose = () => {
    setSuccessMessage("");
    setErrorMessage("");
  };

  if (queryUnprocessedArticles.isLoading) {
    return (
      <LoadingOverlay
        visible={queryUnprocessedArticles.isLoading}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
    );
  }

  if (queryUnprocessedArticles.error) {
    return <>{JSON.stringify(queryUnprocessedArticles.error)}</>;
  }

  return (
    <Box p="lg">
      <Paper maw={640} mx="auto" shadow="xs" p="lg">
        <Title order={2} mb="lg">
          Natural language processing
        </Title>
        <Alert variant="light" color="blue" icon={<IconInfoCircle />} mb="lg">
          The NLP API is designed to extract entities and relationships from the
          articles in the graph based on the predefined graph schema.
          Additionally, it performs entity resolution by linking entities to
          various target knowledge bases such as Wikipedia and others. The
          results are stored in Neo4j as an entity graph.
        </Alert>
        {successMessage ? (
          <Notification
            icon={<IconCheck style={{ width: rem(20), height: rem(20) }} />}
            color="teal"
            title="Done!"
            mt="md"
            withBorder
            style={{ boxShadow: "none" }}
            onClose={handleNotificationClose}
          >
            {successMessage}
          </Notification>
        ) : (
          <>
            <Text size="lg" mb="lg">
              Articles that haven't been processed yet:{" "}
              <strong>
                {queryUnprocessedArticles.isLoading
                  ? "..."
                  : queryUnprocessedArticles.data}
              </strong>
              <ActionIcon
                variant="outline"
                color="teal"
                aria-label="Refresh"
                disabled={queryUnprocessedArticles.data === 0}
                loading={queryUnprocessedArticles.isFetching}
                onClick={handleProcessedArticlesCountRefresh}
                title="Refresh counter"
                ml="xs"
              >
                <IconRefresh
                  style={{ width: "50%", height: "50%" }}
                  stroke={1.5}
                />
              </ActionIcon>
            </Text>
            <form onSubmit={handleFormSubmit}>
              {errorMessage && (
                <Notification
                  icon={
                    <IconX
                      style={{
                        width: rem(20),
                        height: rem(20),
                      }}
                    />
                  }
                  withBorder
                  color="red"
                  title="Error!"
                  mt="lg"
                  style={{ boxShadow: "none" }}
                  onClose={handleNotificationClose}
                >
                  {errorMessage}
                </Notification>
              )}
              <Group mt="lg">
                <Button
                  disabled={queryUnprocessedArticles.data === 0}
                  loading={mutation.isPending}
                  type="submit"
                  color="teal"
                >
                  Process with NLP API
                </Button>
              </Group>
            </form>
          </>
        )}
      </Paper>
    </Box>
  );
}

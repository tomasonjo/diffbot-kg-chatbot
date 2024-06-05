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
} from "@mantine/core";
import { MouseEvent, useEffect, useState } from "react";
import { IconCheck, IconRefresh, IconX } from "@tabler/icons-react";
import { getUnprocessedArticles, processArticles } from "../../api/nlp";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function NaturalLanguageProcessing() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const queryUnprocessedArticles = useQuery({
    queryKey: ["unprocessed-articles"],
    queryFn: getUnprocessedArticles,
    staleTime: 0,
  });

  const queryProcessArticles = useQuery({
    queryKey: ["process-articles"],
    queryFn: processArticles,
    enabled: false,
  });

  const handleProcessArticlesSubmit = (
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    queryProcessArticles.refetch();
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

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["unprocessed-articles"] });
  }, [queryProcessArticles.data, queryClient]);

  useEffect(() => {
    if (queryProcessArticles.error) {
      setErrorMessage("Something went wrong.");
    }
  }, [queryProcessArticles.error]);

  if (queryUnprocessedArticles.isLoading) {
    return <>Loading ...</>;
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
        {successMessage ? (
          <Notification
            icon={<IconCheck style={{ width: rem(20), height: rem(20) }} />}
            color="teal"
            title="Done!"
            mt="md"
            withBorder
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
                loading={queryProcessArticles.isLoading}
                type="button"
                color="teal"
                onClick={handleProcessArticlesSubmit}
              >
                Process with NLP API
              </Button>
            </Group>
          </>
        )}
      </Paper>
    </Box>
  );
}

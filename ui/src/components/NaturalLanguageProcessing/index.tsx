import {
  Button,
  Group,
  Paper,
  Title,
  Text,
  Box,
  Notification,
  rem,
} from "@mantine/core";
import { MouseEvent, useEffect, useState } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";
import { getUnprocessedArticles, processArticles } from "../../api/nlp";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function NaturalLanguageProcessing() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState("");

  const queryUnprocessedArticles = useQuery({
    queryKey: ["unprocessed-articles"],
    queryFn: getUnprocessedArticles,
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

  const handleNotificationClose = () => {
    setSuccessMessage("");
  };

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["unprocessed-articles"] });
  }, [queryProcessArticles.data, queryClient]);

  if (queryUnprocessedArticles.isLoading) {
    return <>Loading ...</>;
  }

  if (queryUnprocessedArticles.error) {
    return <>{JSON.stringify(queryUnprocessedArticles.error)}</>;
  }

  return (
    <Box p="lg">
      <Paper maw={640} mx="auto" shadow="xs" p="lg">
        <Title order={2} mb="xl">
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
            <Text mb="lg">
              Articles that haven't been processed yet:{" "}
              {queryUnprocessedArticles.isLoading
                ? "..."
                : queryUnprocessedArticles.data}
              !
            </Text>
            {queryProcessArticles.error && (
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
              >
                {JSON.stringify(queryProcessArticles.error)}
              </Notification>
            )}
            <Group mt="lg">
              <Button
                disabled={queryUnprocessedArticles.data === 0}
                loading={queryProcessArticles.isLoading}
                type="button"
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

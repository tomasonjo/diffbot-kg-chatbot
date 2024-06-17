import { z } from "zod";
import { useForm, zodResolver } from "@mantine/form";
import {
  Button,
  Group,
  NumberInput,
  Paper,
  Title,
  Text,
  Box,
  Notification,
  rem,
  Loader,
  Alert,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { enhanceEntities, getUnprocessedEntities } from "../../api";
import { FormEvent, useState } from "react";
import { IconCheck, IconInfoCircle, IconX } from "@tabler/icons-react";

const schema = z.object({
  size: z.number().min(1, { message: "Minimum 1 entity." }),
});

export function EnhanceEntities() {
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const unprocessedEntitiesQuery = useQuery({
    queryKey: ["unprocessed-entities"],
    queryFn: getUnprocessedEntities,
  });

  const form = useForm({
    validate: zodResolver(schema),
    initialValues: {
      size: 50,
    },
  });

  const mutation = useMutation({
    mutationFn: enhanceEntities,
    onSuccess: (message: string) => {
      setSuccessMessage(message);
      unprocessedEntitiesQuery.refetch();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      console.log(JSON.stringify(error));
      setErrorMessage("Failed to process entities.");
    },
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    form.validate();

    if (form.isValid()) {
      mutation.mutate(form.values);
    }
  };

  const handleNotificationClose = () => {
    setSuccessMessage("");
    setErrorMessage("");
  };

  return (
    <Box p="lg">
      <Paper maw={640} mx="auto" shadow="xs" p="lg">
        <Title order={2} mb="lg">
          Enhance entities
        </Title>
        <Alert variant="light" color="blue" icon={<IconInfoCircle />} mb="lg">
          The enhance functionality allows you to enrich top mentioned existing
          entities in the knowledge graph by adding additional information using
          the Diffbot's Search API. At the moment, only People and Organization
          nodes can be enriched. This flow is designed to show how easy it is to
          combine structured and unstructured data sources using a knowledge
          graph data representation.
        </Alert>
        {successMessage ? (
          <Notification
            icon={<IconCheck style={{ width: rem(20), height: rem(20) }} />}
            color="gray"
            title="Processing completed."
            mt="md"
            withBorder
            onClose={handleNotificationClose}
            style={{ boxShadow: "none" }}
          >
            {successMessage}
          </Notification>
        ) : (
          <>
            <Text size="lg" mb="lg">
              Entities that haven't been processed yet:{" "}
              <strong>
                {unprocessedEntitiesQuery.isLoading ? (
                  <Loader
                    color="blue"
                    size="xs"
                    type="dots"
                    style={{ display: "inline-flex" }}
                  />
                ) : unprocessedEntitiesQuery.error ? (
                  "unknown"
                ) : (
                  unprocessedEntitiesQuery.data
                )}
              </strong>
            </Text>
            <form onSubmit={handleFormSubmit}>
              <NumberInput
                withAsterisk
                label="Number of entities to enhance"
                mt="sm"
                min={1}
                key={form.key("size")}
                {...form.getInputProps("size")}
              />
              {errorMessage && (
                <Notification
                  icon={<IconX style={{ width: rem(20), height: rem(20) }} />}
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
                <Button color="teal" loading={mutation.isPending} type="submit">
                  Submit
                </Button>
              </Group>
            </form>
          </>
        )}
      </Paper>
    </Box>
  );
}

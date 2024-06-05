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
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { enhanceEntities, getUnprocessedEntities } from "../../api";
import { FormEvent, useState } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";

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
      size: 10,
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
        {successMessage ? (
          <Notification
            icon={<IconCheck style={{ width: rem(20), height: rem(20) }} />}
            color="gray"
            title="Processing completed."
            mt="md"
            withBorder
            onClose={handleNotificationClose}
          >
            {successMessage}
          </Notification>
        ) : errorMessage ? (
          <Notification
            icon={<IconCheck style={{ width: rem(20), height: rem(20) }} />}
            color="red"
            title="Processing completed."
            mt="md"
            withBorder
            onClose={handleNotificationClose}
          >
            {errorMessage}
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
                max={99}
                key={form.key("size")}
                {...form.getInputProps("size")}
              />
              {mutation.error && (
                <Notification
                  icon={<IconX style={{ width: rem(20), height: rem(20) }} />}
                  withBorder
                  color="red"
                  title="Error!"
                  mt="lg"
                >
                  {JSON.stringify(mutation.error)}
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

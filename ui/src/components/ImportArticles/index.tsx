import { z } from "zod";
import { useForm, zodResolver } from "@mantine/form";
import {
  TextInput,
  Button,
  Group,
  NumberInput,
  Paper,
  Title,
  Text,
  Box,
  Select,
  Notification,
  rem,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { importArticles } from "../../api";
import { FormEvent, useState } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";

const INDUSTRY_OPTIONS = [
  "LLM",
  "Artificial intelligence",
  "Natural language processing",
  "Business",
  "Business & finance",
  "Technology & computing",
  "Semantic web",
];

const schema = z.object({
  query: z.string().min(2, { message: "Please enter a query." }),
  tag: z.string(),
  size: z.number().min(1, { message: "You must import at least one article." }),
});

export function ImportArticles() {
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm({
    validate: zodResolver(schema),
    initialValues: {
      query: "",
      tag: "",
      size: 20,
    },
  });

  const mutation = useMutation({
    mutationFn: importArticles,
    onSuccess: (import_count: number) => {
      setSuccessMessage(`Successfully imported ${import_count} articles!`);
    },
    onError: () => {
      setErrorMessage("Failed to import articles.");
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
          Article Importer
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
              Please choose a keyword or field!
            </Text>
            <form onSubmit={handleFormSubmit}>
              <TextInput
                withAsterisk
                label="Keyword or company"
                placeholder="Neo4j inc"
                key={form.key("query")}
                {...form.getInputProps("query")}
              />
              <Select
                label="Industry"
                placeholder="Pick value"
                data={INDUSTRY_OPTIONS}
                key={form.key("tag")}
                {...form.getInputProps("tag")}
                mt="sm"
              />
              <NumberInput
                withAsterisk
                label="Number of articles"
                mt="sm"
                min={1}
                max={99}
                key={form.key("size")}
                {...form.getInputProps("size")}
              />
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

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
  Alert,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { importArticles } from "../../api";
import { FormEvent, useState } from "react";
import { IconCheck, IconInfoCircle, IconX } from "@tabler/icons-react";

const INDUSTRY_OPTIONS = [
  { value: "", label: "None" },
  { value: "LLM", label: "LLM" },
  { value: "Artificial intelligence", label: "Artificial intelligence" },
  {
    value: "Natural language processing",
    label: "Natural language processing",
  },
  { value: "Business", label: "Business" },
  { value: "Business & finance", label: "Business & finance" },
  { value: "Technology & computing", label: "Technology & computing" },
  { value: "Semantic web", label: "Semantic web" },
];

const schema = z
  .object({
    query: z.string().optional(),
    tag: z.string().optional(),
    size: z
      .number()
      .min(1, { message: "You must import at least one article." }),
  })
  .refine((data) => data.query || data.tag, {
    message:
      "Either 'Keyword or company' or 'Industry' or both fields must be provided.",
    path: ["query", "tag"],
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
    onSuccess: (import_count) => {
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
    const validationResult = form.validate();

    if (validationResult.hasErrors) {
      return;
    }
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
        <Alert variant="light" color="blue" icon={<IconInfoCircle />} mb="lg">
          The Article API from Diffbot lets you fetch real-time news efficiently
          based on the keyword or topic you are interested in. It stores the
          results as a lexical graph in Neo4j, which is a graph structure
          representing the relationships between articles and corresponding text
          chunks.
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
            <form onSubmit={handleFormSubmit}>
              <TextInput
                label="Keyword or company"
                placeholder="Example: Neo4j Inc"
                {...form.getInputProps("query")}
              />
              <Select
                label="Industry"
                placeholder="Pick value"
                data={INDUSTRY_OPTIONS}
                {...form.getInputProps("tag")}
                mt="sm"
              />
              <NumberInput
                withAsterisk
                label="Number of articles"
                mt="sm"
                min={1}
                max={99}
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
              {form.errors["query.tag"] && (
                <Notification
                  icon={<IconX style={{ width: rem(20), height: rem(20) }} />}
                  withBorder
                  color="red"
                  title="Error!"
                  mt="lg"
                  style={{ boxShadow: "none" }}
                  withCloseButton={false}
                >
                  {form.errors["query.tag"]}
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

import { z } from "zod";
import { useForm, zodResolver } from "@mantine/form";
import {
  Button,
  Group,
  NumberInput,
  Paper,
  Title,
  Box,
  Notification,
  rem,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { enhanceEntities } from "../../api";
import { FormEvent, useState } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";

const schema = z.object({
  size: z.number().min(1, { message: "Minimum 1 entity." }),
});

export function EnhanceEntities() {
  const [successMessage, setSuccessMessage] = useState("");

  const form = useForm({
    validate: zodResolver(schema),
    initialValues: {
      size: 10,
    },
  });

  const mutation = useMutation({
    mutationFn: enhanceEntities,
    onSuccess: (import_count: number) => {
      console.log("import_count", import_count);
      setSuccessMessage(`Successfully enhanced entities!`);
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
  };

  return (
    <Box p="lg">
      <Paper maw={640} mx="auto" shadow="xs" p="lg">
        <Title order={2} mb="xl">
          Enhance entities
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
            <Title order={3} mb="lg">
              Entities that haven't been processed yet: {0}
            </Title>
            <form onSubmit={handleFormSubmit}>
              <NumberInput
                withAsterisk
                label="Number of articles"
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
                <Button loading={mutation.isPending} type="submit">
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

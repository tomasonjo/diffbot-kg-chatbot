import { z } from 'zod';
import { useForm, zodResolver } from '@mantine/form';
import { TextInput, Button, Group, NumberInput, Paper, Title, Box, Select, Notification, rem } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { importArticles } from '../../api';
import { useState } from 'react';
import { IconCheck } from '@tabler/icons-react';

const INDUSTRY_OPTIONS = [
    "LLM",
    "Artificial intelligence",
    "Natural language processing",
    "Business",
    "Business & finance",
    "Technology & computing",
    "Semantic web",
]

const schema = z.object({
   query: z.string().min(2, { message: 'Please enter a query.' }),
   tag: z.string(),
   size: z.number().min(1, { message: 'You must import at least one article.' }),
});

export function ImportArticles() {
    const [successMessage, setSuccessMessage] = useState("");

    const form = useForm({
        validate: zodResolver(schema),
        initialValues: {
            query: '',
            tag: '',
            size: 20,
        },
    });

     const mutation = useMutation({
        mutationFn: importArticles,
        onSuccess: (import_count: number) => {
            console.log("import_count", import_count)
            setSuccessMessage(`Successfully imported ${import_count} articles!`)
        //queryClient.invalidateQueries({ queryKey: ['todos'] })
        },
    })

    const handleFormSubmit = (event) => {
        event.preventDefault();

        form.validate();

        if(form.isValid()) {
            mutation.mutate(form.values)
        }
    }

    const handleNotificationClose = () => {
        setSuccessMessage("");
    }


    return (
        <Box p="lg">
            <Paper maw={640} mx="auto" shadow="xs" p="lg">
            <Title order={2} mb="xl">Article Importer</Title>
            {successMessage ? (
                 <Notification
                    icon={<IconCheck style={{ width: rem(20), height: rem(20) }} />}
                    color="teal"
                    title="Done!"
                    mt="md"
                    onClose={handleNotificationClose}
                 >
                    {successMessage}
                </Notification>            )

             : (
                <>
                    <Title order={3} mb="lg">Please choose a keyword or field!</Title>
                    <form onSubmit={handleFormSubmit}>
                        <TextInput
                            withAsterisk
                            label="Keyword or Industry"
                            placeholder="Company"
                            key={form.key('query')}
                            {...form.getInputProps('query')}
                        />
                        <Select
                            label="Industry"
                            placeholder="Pick value"
                            data={INDUSTRY_OPTIONS}
                            key={form.key('tag')}
                            {...form.getInputProps('tag')}
                            mt="sm"
                        />
                        <NumberInput
                            withAsterisk
                            label="Number of articles"
                            mt="sm"
                            min={1}
                            max={99}
                            key={form.key('size')}
                            {...form.getInputProps('size')}
                        />
                        <Group mt="lg">
                            <Button disabled={mutation.isPending} type="submit">Submit</Button>
                        </Group>
                    </form>
                </>
            )}
            </Paper>
        </Box>
    )
}


'use server';
/**
 * @fileOverview AI flow to break down a given academic task into smaller sub-tasks.
 *
 * - breakdownTask - A function that suggests sub-tasks for a given task.
 * - BreakdownTaskInput - The input type for the breakdownTask function.
 * - BreakdownTaskOutput - The return type for the breakdownTask function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const BreakdownTaskInputSchema = z.object({
  title: z.string().describe('The main title of the academic task.'),
  description: z.string().optional().describe('An optional description of the task providing more context.'),
});
export type BreakdownTaskInput = z.infer<typeof BreakdownTaskInputSchema>;

const BreakdownTaskOutputSchema = z.object({
  subTasks: z.array(z.string()).describe('A list of suggested sub-tasks or steps to complete the main task.'),
});
export type BreakdownTaskOutput = z.infer<typeof BreakdownTaskOutputSchema>;

export async function breakdownTask(input: BreakdownTaskInput): Promise<BreakdownTaskOutput> {
  return breakdownTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'breakdownTaskPrompt',
  input: {
    schema: BreakdownTaskInputSchema,
  },
  output: {
    schema: BreakdownTaskOutputSchema,
  },
  prompt: `You are an expert academic advisor AI. Your goal is to help students break down larger academic tasks into smaller, manageable sub-tasks.

Given the following academic task:
Title: {{{title}}}
{{#if description}}
Description: {{{description}}}
{{/if}}

Break this task down into a list of clear, actionable sub-tasks or steps. Focus on the process a student would typically follow. Provide the sub-tasks as a simple list of strings.
`,
});

const breakdownTaskFlow = ai.defineFlow<
  typeof BreakdownTaskInputSchema,
  typeof BreakdownTaskOutputSchema
>(
  {
    name: 'breakdownTaskFlow',
    inputSchema: BreakdownTaskInputSchema,
    outputSchema: BreakdownTaskOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    // Ensure output is not null, provide default if needed.
    return output ?? { subTasks: [] };
  }
);

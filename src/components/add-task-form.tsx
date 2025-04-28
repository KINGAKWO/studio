
"use client";

import type * as React from "react";
import { useState } from "react"; // Import useState
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Loader2, Sparkles } from "lucide-react"; // Import Sparkles
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/types/task";
import { breakdownTask } from "@/ai/flows/breakdown-task-flow"; // Import the AI flow
import { useToast } from "@/hooks/use-toast"; // Import useToast

const priorities: TaskPriority[] = ["low", "medium", "high"];

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().max(1000, "Description is too long").optional(), // Increased max length
  deadline: z.date({ required_error: "Deadline is required." }),
  priority: z.enum(priorities, { required_error: "Priority is required." }),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface AddTaskFormProps {
  onSubmit: (data: TaskFormValues) => Promise<void> | void;
  initialData?: Task; // For editing
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function AddTaskForm({
  onSubmit,
  initialData,
  onCancel,
  isSubmitting = false,
}: AddTaskFormProps) {
  const [isBreakingDown, setIsBreakingDown] = useState(false); // State for AI breakdown loading
  const { toast } = useToast(); // Get toast function

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          description: initialData.description || "",
          deadline: initialData.deadline,
          priority: initialData.priority,
        }
      : {
          title: "",
          description: "",
          deadline: undefined,
          priority: "medium",
        },
  });

  const handleSubmit = (data: TaskFormValues) => {
    onSubmit(data);
  };

  const handleBreakdown = async () => {
    const title = form.getValues("title");
    const currentDescription = form.getValues("description");

    if (!title) {
      toast({
        title: "Title Required",
        description: "Please enter a task title before breaking it down.",
        variant: "destructive",
      });
      return;
    }

    setIsBreakingDown(true);
    try {
      const result = await breakdownTask({ title, description: currentDescription });
      if (result.subTasks && result.subTasks.length > 0) {
        const subTaskList = result.subTasks.map(sub => `- ${sub}`).join("\n");
        const newDescription = currentDescription
          ? `${currentDescription}\n\nSuggested Sub-tasks:\n${subTaskList}`
          : `Suggested Sub-tasks:\n${subTaskList}`;
        form.setValue("description", newDescription, { shouldValidate: true });
        toast({
          title: "Task Breakdown Complete",
          description: "Suggested sub-tasks added to the description.",
        });
      } else {
        toast({
          title: "Task Breakdown",
          description: "AI could not suggest sub-tasks for this item.",
        });
      }
    } catch (error) {
      console.error("Error breaking down task:", error);
      toast({
        title: "Error",
        description: "Failed to break down the task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBreakingDown(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Complete Math Homework" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                 <FormLabel>Description (Optional)</FormLabel>
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleBreakdown}
                    disabled={isBreakingDown || !form.watch('title')} // Disable if loading or no title
                    className="text-xs"
                 >
                    {isBreakingDown ? (
                       <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                       <Sparkles className="mr-1 h-3 w-3" />
                    )}
                    Break Down with AI
                 </Button>
              </div>
              <FormControl>
                <Textarea
                  placeholder="e.g., Chapter 5, exercises 1-10. Or click 'Break Down with AI' for suggestions."
                  className="resize-none min-h-[100px]" // Ensure enough height
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority} className="capitalize">
                     {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Deadline</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} // Disable past dates
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isBreakingDown}>Cancel</Button>}
           <Button type="submit" disabled={isSubmitting || isBreakingDown}>
            {(isSubmitting || isBreakingDown) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Save Changes" : "Add Task"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

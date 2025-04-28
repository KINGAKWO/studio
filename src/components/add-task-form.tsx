
"use client";

import type * as React from "react";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Loader2, Sparkles } from "lucide-react";
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
import type { Task, TaskPriority, TaskInputData } from "@/types/task"; // Import TaskInputData
import { breakdownTask } from "@/ai/flows/breakdown-task-flow";
import { useToast } from "@/hooks/use-toast";

const priorities: TaskPriority[] = ["low", "medium", "high"];

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
  deadline: z.date({ required_error: "Deadline is required." }),
  priority: z.enum(priorities, { required_error: "Priority is required." }),
  category: z.string().max(50, "Category is too long").optional(), // Add category field
});

// Use TaskInputData for form values type
type TaskFormValues = z.infer<typeof taskFormSchema>;

interface AddTaskFormProps {
  onSubmit: (data: TaskInputData) => Promise<void> | void; // Expect TaskInputData
  initialData?: Task; // For editing, still use Task type as it has ID
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function AddTaskForm({
  onSubmit,
  initialData,
  onCancel,
  isSubmitting = false,
}: AddTaskFormProps) {
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const { toast } = useToast();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          description: initialData.description || "",
          deadline: initialData.deadline, // Keep as Date object for the form
          priority: initialData.priority,
          category: initialData.category || "", // Populate category if exists
        }
      : {
          title: "",
          description: "",
          deadline: undefined,
          priority: "medium",
          category: "", // Default category
        },
  });

  // The handleSubmit function receives TaskFormValues (which matches TaskInputData structure)
  const handleSubmit = (data: TaskFormValues) => {
    onSubmit(data); // Directly pass the validated form data
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

  const currentLoading = isSubmitting || isBreakingDown;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6"> {/* Reduced spacing */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Complete Math Homework" {...field} disabled={currentLoading} />
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
              <div className="flex justify-between items-center mb-1">
                 <FormLabel>Description (Optional)</FormLabel>
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleBreakdown}
                    disabled={currentLoading || !form.watch('title')}
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
                  className="resize-none min-h-[80px]" // Slightly smaller height
                  {...field}
                   disabled={currentLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"> {/* Grid for Priority, Deadline, Category */}
             <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={currentLoading}>
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
                            "w-full justify-start text-left font-normal", // Changed width to full
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={currentLoading}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" /> {/* Icon on left */}
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
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
             <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Homework" {...field} disabled={currentLoading} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
         </div>

        <div className="flex justify-end space-x-2 pt-4"> {/* Added padding top */}
            {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={currentLoading}>Cancel</Button>}
           <Button type="submit" disabled={currentLoading}>
            {currentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Save Changes" : "Add Task"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
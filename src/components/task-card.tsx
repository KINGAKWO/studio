
"use client";

import type * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Edit, Trash2, Calendar, Flag, ChevronDown, ChevronUp } from "lucide-react"; // Import Chevron icons
import { useState } from "react"; // Import useState

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/types/task";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  viewMode?: 'list' | 'grid'; // Add viewMode prop
}

const priorityColors: Record<TaskPriority, string> = {
    low: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
    high: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
}

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
    low: <Flag className="h-3 w-3 text-blue-500" />,
    medium: <Flag className="h-3 w-3 text-yellow-500" />,
    high: <Flag className="h-3 w-3 text-red-500" />,
}


export function TaskCard({ task, onToggleComplete, onEdit, onDelete, viewMode = 'list' }: TaskCardProps) {
  const timeRemaining = formatDistanceToNow(task.deadline, { addSuffix: true });
  const isOverdue = !task.completed && new Date() > task.deadline;
  const [showDescription, setShowDescription] = useState(false); // State for description visibility

  const toggleDescription = () => setShowDescription(!showDescription);

  // Only show description toggle if description exists and view is list
  const canToggleDescription = !!task.description && viewMode === 'list';

  return (
    <Card className={cn(
        "w-full transition-opacity duration-300",
        task.completed && "opacity-60",
        viewMode === 'list' && "flex flex-col sm:flex-row", // Flex layout for list view
        viewMode === 'grid' && "flex flex-col" // Standard card layout for grid view
      )}>
       {/* Checkbox and Main Info (Consistent across views) */}
       <div className={cn(
           "flex items-start space-x-4 p-4", // Padding for this section
           viewMode === 'list' && "flex-shrink-0 sm:w-1/3 md:w-1/4 lg:w-1/5 border-b sm:border-b-0 sm:border-r" // Width and border for list view
        )}>
         <Checkbox
            id={`task-${task.id}`}
            checked={task.completed}
            onCheckedChange={(checked) => onToggleComplete(task.id, !!checked)}
            className="mt-1 flex-shrink-0"
            aria-labelledby={`title-${task.id}`}
            />
          <div className="flex-1 min-w-0"> {/* Ensure text wraps */}
             <CardTitle id={`title-${task.id}`} className={cn("text-lg", task.completed && "line-through")}>
                {task.title}
             </CardTitle>
            {/* Show description differently based on view */}
             {task.description && viewMode === 'grid' && (
                 <CardDescription className="mt-1 text-sm break-words whitespace-pre-wrap">
                    {task.description}
                </CardDescription>
            )}
         </div>
      </div>

       {/* Details and Actions (Layout adjusts based on view) */}
      <div className={cn(
          "flex-1 flex flex-col", // Take remaining space and column layout
           viewMode === 'list' ? "p-4 justify-between" : "p-4 pt-0" // Different padding/alignment
        )}>
        {/* Description for List View (Collapsible) */}
        {task.description && viewMode === 'list' && (
          <div className="mb-3">
            <button
              onClick={toggleDescription}
              className="flex items-center text-xs text-muted-foreground hover:text-foreground focus:outline-none"
              aria-expanded={showDescription}
              aria-controls={`desc-${task.id}`}
            >
              {showDescription ? 'Hide Description' : 'Show Description'}
              {showDescription ? <ChevronUp className="ml-1 h-3 w-3"/> : <ChevronDown className="ml-1 h-3 w-3"/>}
            </button>
            {showDescription && (
              <CardDescription id={`desc-${task.id}`} className="mt-1 text-sm break-words whitespace-pre-wrap">
                {task.description}
              </CardDescription>
            )}
          </div>
        )}

         <CardFooter className={cn(
             "flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-muted-foreground p-0 gap-3",
             viewMode === 'list' ? "mt-auto" : "mt-4" // Push to bottom in list view, add margin in grid
         )}>
             <div className="flex flex-wrap items-center gap-x-3 gap-y-1"> {/* Allow wrapping */}
                <Badge variant="outline" className={cn("capitalize flex items-center gap-1 px-2 py-0.5", priorityColors[task.priority])}>
                    {priorityIcons[task.priority]}
                    {task.priority}
                </Badge>
                <div className="flex items-center gap-1">
                     <Calendar className="h-3 w-3" />
                    <span className={cn(isOverdue && "text-destructive font-medium")}>
                      {isOverdue ? `Overdue ${timeRemaining}` : `Due ${timeRemaining}`}
                    </span>
                </div>
             </div>
             <div className="flex items-center space-x-1 flex-shrink-0 mt-2 sm:mt-0"> {/* Action buttons */}
                 {task.completed && (
                  <div className="flex items-center text-accent mr-2">
                    <Check className="h-4 w-4 mr-1" />
                    <span className="text-xs">Completed</span>
                  </div>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)} aria-label="Edit Task">
                    <Edit className="h-4 w-4" />
                </Button>
                 <AlertDialog>
                     <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete Task">
                             <Trash2 className="h-4 w-4" />
                         </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the task "{task.title}".
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(task.id)} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

             </div>
         </CardFooter>
       </div>
    </Card>
  );
}
// Import buttonVariants for AlertDialog action styling
import { buttonVariants } from "@/components/ui/button"


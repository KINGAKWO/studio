
"use client";

import type * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Edit, Trash2, Calendar, Flag, ChevronDown, ChevronUp, Loader2, Tag } from "lucide-react";
import { useEffect, useState } from "react"; // Import useEffect and useState

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
import { buttonVariants } from "@/components/ui/button"; // Import buttonVariants
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for placeholder

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  viewMode?: 'list' | 'grid';
  isUpdating?: boolean; // Add prop for loading state
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


export function TaskCard({ task, onToggleComplete, onEdit, onDelete, viewMode = 'list', isUpdating = false }: TaskCardProps) {
  const [isMounted, setIsMounted] = useState(false); // State to track client-side mounting
  const [showDescription, setShowDescription] = useState(false);

  // Ensure component is mounted on the client before rendering potentially mismatched content
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const timeRemaining = isMounted ? formatDistanceToNow(task.deadline, { addSuffix: true }) : '';
  const isOverdue = !task.completed && new Date() > task.deadline;


  const toggleDescription = () => setShowDescription(!showDescription);
  const canToggleDescription = !!task.description && viewMode === 'list';

  return (
    <Card className={cn(
        "w-full transition-opacity duration-300 hover:shadow-md", // Added hover shadow
        task.completed && "opacity-60 hover:opacity-80", // Adjust opacity on hover for completed
        isUpdating && "opacity-50 pointer-events-none animate-pulse", // Dim and pulse card during updates
        viewMode === 'list' && "flex flex-col sm:flex-row",
        viewMode === 'grid' && "flex flex-col"
      )}>
       {/* Checkbox and Main Info */}
       <div className={cn(
           "flex items-start space-x-4 p-4",
           viewMode === 'list' && "flex-shrink-0 sm:w-auto sm:max-w-[40%] md:max-w-[35%] lg:max-w-[30%] border-b sm:border-b-0 sm:border-r" // Adjusted width constraints for list view
        )}>
         <Checkbox
            id={`task-${task.id}`}
            checked={task.completed}
            onCheckedChange={(checked) => onToggleComplete(task.id, !!checked)}
            className="mt-1 flex-shrink-0"
            aria-labelledby={`title-${task.id}`}
            disabled={isUpdating} // Disable during update
            />
          <div className="flex-1 min-w-0">
             <CardTitle id={`title-${task.id}`} className={cn("text-lg font-semibold", task.completed && "line-through text-muted-foreground")}>
                {task.title}
             </CardTitle>
             {task.description && viewMode === 'grid' && (
                 <CardDescription className="mt-1 text-sm break-words whitespace-pre-wrap line-clamp-3"> {/* Added line clamp */}
                    {task.description}
                </CardDescription>
            )}
         </div>
      </div>

       {/* Details and Actions */}
      <div className={cn(
          "flex-1 flex flex-col",
           viewMode === 'list' ? "p-4 justify-between" : "p-4 pt-0"
        )}>
        {/* Description for List View */}
        {task.description && viewMode === 'list' && (
          <div className="mb-3">
            <button
              onClick={toggleDescription}
              className="flex items-center text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded px-1" // Added focus ring and padding
              aria-expanded={showDescription}
              aria-controls={`desc-${task.id}`}
              disabled={isUpdating}
            >
              {showDescription ? 'Hide' : 'Show'} Description
              {showDescription ? <ChevronUp className="ml-1 h-3 w-3"/> : <ChevronDown className="ml-1 h-3 w-3"/>}
            </button>
            {showDescription && (
              <CardDescription id={`desc-${task.id}`} className="mt-1.5 text-sm break-words whitespace-pre-wrap bg-muted/50 p-2 rounded"> {/* Added background */}
                {task.description}
              </CardDescription>
            )}
          </div>
        )}

         <CardFooter className={cn(
             "flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-muted-foreground p-0 gap-3",
             viewMode === 'list' ? "mt-auto" : "mt-4"
         )}>
             <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                 {task.category && (
                   <Badge variant="secondary" className="flex items-center gap-1 px-2 py-0.5 font-normal">
                        <Tag className="h-3 w-3" />
                        {task.category}
                    </Badge>
                 )}
                <Badge variant="outline" className={cn("capitalize flex items-center gap-1 px-2 py-0.5", priorityColors[task.priority])}>
                    {priorityIcons[task.priority]}
                    {task.priority}
                </Badge>
                <div className="flex items-center gap-1">
                     <Calendar className="h-3 w-3" />
                     {isMounted ? (
                        <span className={cn(isOverdue && "text-destructive font-medium")}>
                        {isOverdue ? `Overdue ${timeRemaining}` : `Due ${timeRemaining}`}
                        </span>
                     ) : (
                        <Skeleton className="h-3 w-20" /> // Show skeleton placeholder before mounting
                     )}
                </div>
             </div>
             <div className="flex items-center space-x-1 flex-shrink-0 mt-2 sm:mt-0 self-end sm:self-center"> {/* Align actions */}
                 {task.completed && (
                  <div className="flex items-center text-green-600 dark:text-green-400 mr-2"> {/* Changed color */}
                    <Check className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">Completed</span>
                  </div>
                )}
                {isUpdating ? ( // Show loader on action buttons when updating
                     <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)} aria-label="Edit Task" disabled={isUpdating || task.completed}> {/* Disable edit if completed */}
                        <Edit className="h-4 w-4" />
                    </Button>
                     <AlertDialog>
                         <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete Task" disabled={isUpdating}>
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
                            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(task.id)} className={buttonVariants({ variant: "destructive" })} disabled={isUpdating}>
                                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </>
                 )}
             </div>
         </CardFooter>
       </div>
    </Card>
  );
}

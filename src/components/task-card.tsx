"use client";

import type * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Edit, Trash2, Calendar, Flag } from "lucide-react";

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


interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const priorityColors: Record<TaskPriority, string> = {
    low: 'bg-blue-100 text-blue-800 border-blue-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-red-100 text-red-800 border-red-300',
}

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
    low: <Flag className="h-3 w-3 text-blue-500" />,
    medium: <Flag className="h-3 w-3 text-yellow-500" />,
    high: <Flag className="h-3 w-3 text-red-500" />,
}


export function TaskCard({ task, onToggleComplete, onEdit, onDelete }: TaskCardProps) {
  const timeRemaining = formatDistanceToNow(task.deadline, { addSuffix: true });
  const isOverdue = !task.completed && new Date() > task.deadline;

  return (
    <Card className={cn("w-full transition-opacity", task.completed && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-4">
           <Checkbox
            id={`task-${task.id}`}
            checked={task.completed}
            onCheckedChange={(checked) => onToggleComplete(task.id, !!checked)}
            className="mt-1"
            aria-labelledby={`title-${task.id}`}
            />
          <div className="flex-1">
            <CardTitle id={`title-${task.id}`} className={cn("text-lg", task.completed && "line-through")}>{task.title}</CardTitle>
            {task.description && <CardDescription className="mt-1 text-sm">{task.description}</CardDescription>}
         </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(task)} aria-label="Edit Task">
                <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(task.id)} aria-label="Delete Task">
                <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
          {/* Placeholder for potential category */}
          {/* {task.category && <Badge variant="secondary" className="mr-2">{task.category}</Badge>} */}
      </CardContent>
      <CardFooter className="flex justify-between items-center text-xs text-muted-foreground pt-0">
        <div className="flex items-center space-x-2">
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
        {task.completed && (
          <div className="flex items-center text-accent">
            <Check className="h-4 w-4 mr-1" />
            <span>Completed</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}


"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns"; // Import format function
import { Plus, ListFilter, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTaskForm } from "@/components/add-task-form";
import { TaskCard } from "@/components/task-card";
import type { Task, TaskPriority } from "@/types/task";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils"; // Import cn utility
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { Info } from 'lucide-react'; // Import Info icon

// Mock task data (replace with actual data fetching)
const initialTasks: Task[] = [
  { id: '1', title: 'Math Homework Chapter 5', description: 'Exercises 1-10', deadline: new Date(Date.now() + 86400000 * 2), priority: 'high', completed: false, category: 'Homework' },
  { id: '2', title: 'History Essay Outline', deadline: new Date(Date.now() + 86400000 * 5), priority: 'medium', completed: false, category: 'Projects' },
  { id: '3', title: 'Prepare for Chemistry Quiz', description: 'Review lecture notes and textbook chapter 3', deadline: new Date(Date.now() + 86400000 * 1), priority: 'high', completed: true, category: 'Exams' },
  { id: '4', title: 'Read Literature Novel', deadline: new Date(Date.now() + 86400000 * 7), priority: 'low', completed: false, category: 'Homework' },
];

type SortOption = 'deadline' | 'priority' | 'title';
type FilterOption = 'all' | 'completed' | 'incomplete';
type ViewOption = 'list' | 'grid';

export function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('deadline');
  const [filterOption, setFilterOption] = useState<FilterOption>('incomplete'); // Default to incomplete
  const [viewOption, setViewOption] = useState<ViewOption>('list');

  const handleAddTask = async (data: Omit<Task, 'id' | 'completed'>) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newTask: Task = {
      ...data,
      id: Date.now().toString(), // Simple ID generation for demo
      completed: false,
    };
    setTasks(prev => [newTask, ...prev]);
    setIsSubmitting(false);
    setIsAddDialogOpen(false); // Close dialog on success
  };

  const handleEditTask = async (data: Omit<Task, 'id' | 'completed'>) => {
      if (!editingTask) return;
      setIsSubmitting(true);
       // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...editingTask, ...data } : t));
      setIsSubmitting(false);
      setEditingTask(null); // Close editing mode/dialog
      setIsAddDialogOpen(false); // Explicitly close dialog after editing
  };

  const handleToggleComplete = (id: string, completed: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
    // TODO: Add API call to update task status
  };

  const handleDeleteTask = (id: string) => {
    // Add confirmation dialog here if needed
    setTasks(prev => prev.filter(t => t.id !== id));
    // TODO: Add API call to delete task
  };

  const startEditTask = (task: Task) => {
    setEditingTask(task);
    // Open the edit dialog (can be the same as add dialog)
    setIsAddDialogOpen(true);
  }

  const cancelEdit = () => {
    setEditingTask(null);
    setIsAddDialogOpen(false);
  }


  const completedTasks = useMemo(() => tasks.filter(task => task.completed).length, [tasks]);
  const totalTasks = tasks.length;
  const incompleteTasksCount = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const upcomingTasks = useMemo(() => tasks.filter(task => !task.completed && task.deadline >= new Date()).sort((a, b) => a.deadline.getTime() - b.deadline.getTime()).slice(0, 3), [tasks]);


  const priorityOrder: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;
    if (filterOption === 'completed') {
      filtered = tasks.filter(t => t.completed);
    } else if (filterOption === 'incomplete') {
      filtered = tasks.filter(t => !t.completed);
    }

    return filtered.sort((a, b) => {
      // Completed tasks should always appear after incomplete tasks if sorting by deadline/priority
      if (sortOption !== 'title') {
          if (a.completed !== b.completed) {
              return a.completed ? 1 : -1;
          }
      }

      switch (sortOption) {
        case 'deadline':
          return a.deadline.getTime() - b.deadline.getTime();
        case 'priority':
          // Sort by priority (high first), then by deadline
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.deadline.getTime() - b.deadline.getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [tasks, sortOption, filterOption]);


  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">TaskWise Dashboard</h1>
        <p className="text-muted-foreground">Manage your academic tasks efficiently.</p>
      </header>

      {/* Progress Section */}
       <section className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Incomplete Tasks</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{incompleteTasksCount}</div>
              <p className="text-xs text-muted-foreground">
                {completedTasks} completed out of {totalTasks}
             </p>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold mb-2">{completionRate}%</div>
             <Progress value={completionRate} aria-label={`${completionRate}% tasks completed`} />
           </CardContent>
         </Card>
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
                {upcomingTasks.length > 0 ? (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                    {upcomingTasks.map(task => (
                        <li key={task.id} className="flex justify-between items-center">
                        <span className="truncate pr-2">{task.title}</span>
                        <span className="flex-shrink-0 whitespace-nowrap">
                            {format(task.deadline, 'MMM dd')} {/* Correct usage */}
                        </span>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
                )}
            </CardContent>
          </Card>
       </section>

        {/* Pending Features Alert */}
        <Alert className="mb-8">
             <Info className="h-4 w-4" />
             <AlertTitle>Work in Progress</AlertTitle>
             <AlertDescription>
                 The following features are planned but not yet implemented:
                 <ul className="list-disc list-inside mt-1 text-xs">
                     <li>Deadline reminders via push notifications</li>
                     <li>Calendar sync (e.g., Google Calendar)</li>
                     <li>Offline access</li>
                     <li>Task report generation</li>
                     <li>Firebase integration for data persistence</li>
                 </ul>
             </AlertDescription>
         </Alert>


      {/* Task List Section */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h2 className="text-2xl font-semibold">Your Tasks</h2>
           <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
               if (!open) cancelEdit(); // Reset editing state when dialog closes
               setIsAddDialogOpen(open);
           }}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add New Task
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] md:max-w-lg">
                    <DialogHeader>
                    <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    </DialogHeader>
                    <AddTaskForm
                        onSubmit={editingTask ? handleEditTask : handleAddTask}
                        initialData={editingTask ?? undefined}
                        onCancel={cancelEdit}
                        isSubmitting={isSubmitting}
                    />
                </DialogContent>
            </Dialog>
        </div>

         {/* Filters and View Options */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <Tabs value={filterOption} onValueChange={(value) => setFilterOption(value as FilterOption)}>
                <TabsList>
                    <TabsTrigger value="incomplete">Incomplete</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
            </Tabs>

             <div className="flex items-center gap-2">
                <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="deadline">Sort by Deadline</SelectItem>
                        <SelectItem value="priority">Sort by Priority</SelectItem>
                        <SelectItem value="title">Sort by Title</SelectItem>
                    </SelectContent>
                </Select>
                 <Tabs value={viewOption} onValueChange={(value) => setViewOption(value as ViewOption)}>
                    <TabsList className="grid w-full grid-cols-2 h-9">
                        <TabsTrigger value="list" className="h-7"><List className="h-4 w-4"/></TabsTrigger>
                        <TabsTrigger value="grid" className="h-7"><LayoutGrid className="h-4 w-4"/></TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>


        {filteredAndSortedTasks.length > 0 ? (
           <div className={cn(
               "gap-4",
                viewOption === 'list' ? "space-y-4" : "grid md:grid-cols-2 lg:grid-cols-3"
            )}>
                {filteredAndSortedTasks.map(task => (
                <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onEdit={startEditTask}
                    onDelete={handleDeleteTask}
                    viewMode={viewOption} // Pass view mode to TaskCard
                />
                ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground mt-8 border border-dashed rounded-lg p-8">
            <p className="font-semibold">No tasks match your current filters.</p>
             {filterOption !== 'all' && (
                 <p className="text-sm">Try selecting "All" tasks to see everything.</p>
            )}
            {tasks.length === 0 && (
                <p className="text-sm mt-2">Looks like you haven't added any tasks yet. Click "Add New Task" to get started!</p>
            )}
          </div>
        )}
      </section>
       {/* Footer Removed - moved to Alert */}
    </div>
  );
}


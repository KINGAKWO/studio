
"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { Timestamp, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, onSnapshot, orderBy, writeBatch } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ListFilter, LayoutGrid, List, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTaskForm } from "@/components/add-task-form";
import { TaskCard } from "@/components/task-card";
import type { Task, TaskPriority, TaskDocument, TaskInputData } from "@/types/task";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/lib/firebase"; // Import Firestore instance
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle"; // Import ThemeToggle

type SortOption = 'deadline' | 'priority' | 'title';
type FilterOption = 'all' | 'completed' | 'incomplete';
type ViewOption = 'list' | 'grid';

// --- Firestore Functions ---

// Fetch tasks using real-time updates
const useTasks = () => {
  return useQuery<Task[], Error>({
    queryKey: ['tasks'],
    queryFn: () => {
      return new Promise((resolve, reject) => {
        const q = query(collection(db, "tasks"), orderBy("deadline", "asc")); // Adjust ordering as needed
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const tasksData: Task[] = querySnapshot.docs.map(doc => {
            const data = doc.data() as Omit<TaskDocument, 'id'>;
            return {
              id: doc.id,
              ...data,
              deadline: data.deadline.toDate(), // Convert Timestamp to Date
            };
          });
          resolve(tasksData);
        }, (error) => {
          console.error("Error fetching tasks:", error);
          reject(error);
        });
        // Returning unsubscribe for cleanup, though React Query handles this internally
        return unsubscribe;
      });
    },
    staleTime: Infinity, // Keep data fresh with real-time updates
    refetchOnWindowFocus: false, // No need to refetch on focus with real-time updates
  });
};

const addTaskMutation = async (newTaskData: TaskInputData): Promise<string> => {
  const docRef = await addDoc(collection(db, "tasks"), {
    ...newTaskData,
    deadline: Timestamp.fromDate(newTaskData.deadline), // Convert Date to Timestamp
    completed: false, // Ensure new tasks are incomplete
    createdAt: serverTimestamp(), // Optional: track creation time
  });
  return docRef.id;
};

const updateTaskMutation = async (taskData: Task): Promise<void> => {
    const { id, ...dataToUpdate } = taskData;
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, {
      ...dataToUpdate,
      deadline: Timestamp.fromDate(dataToUpdate.deadline), // Convert Date back to Timestamp
    });
};

const toggleTaskCompleteMutation = async ({ id, completed }: { id: string; completed: boolean }): Promise<void> => {
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, { completed });
};

const deleteTaskMutation = async (id: string): Promise<void> => {
    const taskRef = doc(db, "tasks", id);
    await deleteDoc(taskRef);
};

// --- Dashboard Component ---

export function Dashboard() {
  const { data: tasks = [], isLoading, error } = useTasks();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('deadline');
  const [filterOption, setFilterOption] = useState<FilterOption>('incomplete');
  const [viewOption, setViewOption] = useState<ViewOption>('list');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: addTask, isPending: isAddingTask } = useMutation({
    mutationFn: addTaskMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Success", description: "Task added successfully." });
      setIsAddDialogOpen(false);
    },
    onError: (err) => {
      console.error("Error adding task:", err);
      toast({ title: "Error", description: "Failed to add task.", variant: "destructive" });
    },
  });

  const { mutate: updateTask, isPending: isUpdatingTask } = useMutation({
     mutationFn: updateTaskMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Success", description: "Task updated successfully." });
      setEditingTask(null);
      setIsAddDialogOpen(false);
    },
    onError: (err) => {
      console.error("Error updating task:", err);
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    },
  });

   const { mutate: toggleComplete, isPending: isTogglingComplete } = useMutation({
    mutationFn: toggleTaskCompleteMutation,
     onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast({ title: "Status Updated", description: `Task marked as ${variables.completed ? 'complete' : 'incomplete'}.` });
     },
    onError: (err) => {
      console.error("Error toggling task:", err);
      toast({ title: "Error", description: "Failed to update task status.", variant: "destructive" });
    },
  });

  const { mutate: deleteTask, isPending: isDeletingTask } = useMutation({
     mutationFn: deleteTaskMutation,
     onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Success", description: "Task deleted successfully." });
    },
    onError: (err) => {
      console.error("Error deleting task:", err);
      toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
    },
  });


  const handleAddTaskSubmit = (data: TaskInputData) => {
    addTask(data);
  };

  const handleEditTaskSubmit = (data: TaskInputData) => {
    if (!editingTask) return;
     // Construct the full task object for the mutation function
     const taskToUpdate: Task = {
       ...editingTask, // Keep the original ID and completed status
       title: data.title,
       description: data.description,
       deadline: data.deadline,
       priority: data.priority,
       // category: data.category, // Include if category is in the form
     };
    updateTask(taskToUpdate);
  };

  const handleToggleComplete = (id: string, completed: boolean) => {
     toggleComplete({ id, completed });
  };

  const handleDeleteTask = (id: string) => {
    // Confirmation is handled within TaskCard's AlertDialog
    deleteTask(id);
  };

  const startEditTask = (task: Task) => {
    setEditingTask(task);
    setIsAddDialogOpen(true);
  }

  const cancelEdit = () => {
    setEditingTask(null);
    setIsAddDialogOpen(false);
  }

  // --- Derived Data ---
  const completedTasks = useMemo(() => tasks.filter(task => task.completed).length, [tasks]);
  const totalTasks = tasks.length;
  const incompleteTasksCount = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const upcomingTasks = useMemo(() => tasks.filter(task => !task.completed && task.deadline >= new Date()).sort((a, b) => a.deadline.getTime() - b.deadline.getTime()).slice(0, 3), [tasks]);
  const overdueTasksCount = useMemo(() => tasks.filter(task => !task.completed && task.deadline < new Date()).length, [tasks]);


  const priorityOrder: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;
    if (filterOption === 'completed') {
      filtered = tasks.filter(t => t.completed);
    } else if (filterOption === 'incomplete') {
      filtered = tasks.filter(t => !t.completed);
    }

    return filtered.sort((a, b) => {
       // Basic completed status sorting (move completed down) - refined later if needed
       if (a.completed !== b.completed) {
         return a.completed ? 1 : -1;
       }

      switch (sortOption) {
        case 'deadline':
          return a.deadline.getTime() - b.deadline.getTime();
        case 'priority':
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.deadline.getTime() - b.deadline.getTime(); // Secondary sort by deadline
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [tasks, sortOption, filterOption]);

  const isSubmitting = isAddingTask || isUpdatingTask; // Combine loading states

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">TaskWise Dashboard</h1>
          <p className="text-muted-foreground">Your academic task management hub.</p>
        </div>
        <ThemeToggle />
      </header>

       {/* Stats Section */}
      <section className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4"> {/* Adjusted grid */}
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
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-destructive">{overdueTasksCount}</div>
              <p className="text-xs text-muted-foreground">
                Tasks past their deadline
             </p>
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
                           {format(task.deadline, 'MMM dd')}
                       </span>
                       </li>
                   ))}
                   </ul>
               ) : (
                   <p className="text-sm text-muted-foreground">No immediate deadlines.</p>
               )}
           </CardContent>
         </Card>
      </section>

      {/* Planned Features Alert */}
       <Alert className="mb-8 border-blue-500 dark:border-blue-400">
         <Info className="h-4 w-4 text-blue-500 dark:text-blue-400" />
         <AlertTitle className="text-blue-800 dark:text-blue-300">Future Enhancements</AlertTitle>
         <AlertDescription className="text-blue-700 dark:text-blue-300">
           Features planned for future updates:
           <ul className="list-disc list-inside mt-1 text-xs">
             <li>Deadline reminders (push notifications)</li>
             <li>Calendar sync (e.g., Google Calendar)</li>
             <li>Offline access improvements</li>
             <li>Task report generation & analytics</li>
             <li>Advanced filtering/categorization</li>
           </ul>
         </AlertDescription>
       </Alert>


      {/* Task List Section */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h2 className="text-2xl font-semibold">Your Tasks</h2>
           <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
               if (!open) cancelEdit();
               setIsAddDialogOpen(open);
           }}>
                <DialogTrigger asChild>
                    <Button disabled={isLoading}> {/* Disable button while loading */}
                        <Plus className="mr-2 h-4 w-4" /> Add New Task
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] md:max-w-lg">
                    <DialogHeader>
                    <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    </DialogHeader>
                    {/* Pass correct onSubmit based on mode */}
                    <AddTaskForm
                        onSubmit={editingTask ? handleEditTaskSubmit : handleAddTaskSubmit}
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


        {/* Task Display Area */}
        {isLoading && <p>Loading tasks...</p>}
        {error && <p className="text-destructive">Error loading tasks: {error.message}</p>}
        {!isLoading && !error && (
            filteredAndSortedTasks.length > 0 ? (
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
                      viewMode={viewOption}
                      isUpdating={isTogglingComplete || isDeletingTask} // Pass loading state for individual actions
                  />
                  ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground mt-8 border border-dashed rounded-lg p-8">
               <p className="font-semibold">
                   {tasks.length === 0 ? 'No tasks yet!' : 'No tasks match your current filters.'}
               </p>
                {tasks.length === 0 ? (
                     <p className="text-sm mt-2">Click "Add New Task" to get started!</p>
                ) : filterOption !== 'all' && (
                     <p className="text-sm">Try selecting "All" tasks or adjusting filters.</p>
                )}
            </div>
          )
        )}
      </section>
    </div>
  );
}

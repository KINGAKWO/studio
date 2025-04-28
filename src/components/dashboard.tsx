
"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { Timestamp, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, onSnapshot, orderBy, writeBatch } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ListFilter, LayoutGrid, List, Info, Tag, Loader2 } from "lucide-react"; // Added Loader2 import
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

type SortOption = 'deadline' | 'priority' | 'title' | 'category'; // Added category sort
type FilterOption = 'all' | 'completed' | 'incomplete';
type ViewOption = 'list' | 'grid';

// --- Firestore Functions ---

// Fetch tasks using real-time updates
const useTasks = () => {
  return useQuery<Task[], Error>({
    queryKey: ['tasks'],
    queryFn: () => {
      return new Promise((resolve, reject) => {
        const q = query(collection(db, "tasks"), orderBy("createdAt", "desc")); // Default order by creation time (desc)
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const tasksData: Task[] = querySnapshot.docs.map(doc => {
            const data = doc.data() as Omit<TaskDocument, 'id'>;
            return {
              id: doc.id,
              title: data.title,
              description: data.description,
              deadline: data.deadline.toDate(), // Convert Timestamp to Date
              priority: data.priority,
              completed: data.completed,
              category: data.category, // Include category
              createdAt: data.createdAt?.toDate(), // Convert Timestamp to Date if exists
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
    createdAt: serverTimestamp(), // Track creation time
    category: newTaskData.category || "", // Ensure category is saved (or empty string)
  });
  return docRef.id;
};

const updateTaskMutation = async (taskData: Task): Promise<void> => {
    const { id, createdAt, ...dataToUpdate } = taskData; // Exclude createdAt from update data
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, {
      ...dataToUpdate,
      deadline: Timestamp.fromDate(dataToUpdate.deadline), // Convert Date back to Timestamp
      category: dataToUpdate.category || "", // Ensure category is updated (or empty string)
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all'); // State for category filter

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- Mutations ---
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

  // --- Event Handlers ---
  const handleAddTaskSubmit = (data: TaskInputData) => {
    addTask(data);
  };

  const handleEditTaskSubmit = (data: TaskInputData) => {
    if (!editingTask) return;
     const taskToUpdate: Task = {
       ...editingTask, // Keep the original ID, completed status, and createdAt
       title: data.title,
       description: data.description,
       deadline: data.deadline,
       priority: data.priority,
       category: data.category, // Include category
     };
    updateTask(taskToUpdate);
  };

  const handleToggleComplete = (id: string, completed: boolean) => {
     toggleComplete({ id, completed });
  };

  const handleDeleteTask = (id: string) => {
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

  // Extract unique categories for filtering
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    tasks.forEach(task => {
      if (task.category) {
        categories.add(task.category);
      }
    });
    return ['all', ...Array.from(categories).sort()]; // Add 'all' option
  }, [tasks]);


  const priorityOrder: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;

    // Apply status filter
    if (filterOption === 'completed') {
      filtered = filtered.filter(t => t.completed);
    } else if (filterOption === 'incomplete') {
      filtered = filtered.filter(t => !t.completed);
    }

     // Apply category filter
     if (categoryFilter !== 'all') {
        filtered = filtered.filter(t => t.category === categoryFilter);
     }


    // Apply sorting
    return filtered.sort((a, b) => {
      // Always sort incomplete tasks before completed tasks if 'all' filter is active
      if (filterOption === 'all' && a.completed !== b.completed) {
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
        case 'category': // Sort by category, then by deadline
           const catA = a.category || '';
           const catB = b.category || '';
           if (catA !== catB) return catA.localeCompare(catB);
           return a.deadline.getTime() - b.deadline.getTime();
        default:
          return 0;
      }
    });
  }, [tasks, sortOption, filterOption, categoryFilter]);

  const isSubmitting = isAddingTask || isUpdatingTask; // Combine loading states

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">TaskWise Dashboard</h1>
          <p className="text-muted-foreground text-sm">Your academic task management hub.</p>
        </div>
        <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
               if (!open) cancelEdit();
               setIsAddDialogOpen(open);
            }}>
                 <DialogTrigger asChild>
                     <Button disabled={isLoading} size="sm">
                         <Plus className="mr-2 h-4 w-4" /> Add Task
                     </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-lg md:max-w-xl"> {/* Adjusted width */}
                     <DialogHeader>
                     <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                     </DialogHeader>
                     <AddTaskForm
                         onSubmit={editingTask ? handleEditTaskSubmit : handleAddTaskSubmit}
                         initialData={editingTask ?? undefined}
                         onCancel={cancelEdit}
                         isSubmitting={isSubmitting}
                     />
                 </DialogContent>
             </Dialog>
            <ThemeToggle />
        </div>
      </header>

       {/* Stats Section */}
      <section className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incomplete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incompleteTasksCount}</div>
             <p className="text-xs text-muted-foreground">
               {completedTasks} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{completionRate}%</div>
            <Progress value={completionRate} aria-label={`${completionRate}% tasks completed`} />
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-destructive">{overdueTasksCount}</div>
              <p className="text-xs text-muted-foreground">
                Tasks past deadline
             </p>
           </CardContent>
         </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
           </CardHeader>
           <CardContent>
               {upcomingTasks.length > 0 ? (
                   <ul className="space-y-1 text-xs text-muted-foreground">
                   {upcomingTasks.map(task => (
                       <li key={task.id} className="flex justify-between items-center gap-2">
                       <span className="truncate">{task.title}</span>
                       <span className="flex-shrink-0 whitespace-nowrap">
                           {format(task.deadline, 'MMM dd')}
                       </span>
                       </li>
                   ))}
                   </ul>
               ) : (
                   <p className="text-xs text-muted-foreground">No immediate deadlines.</p>
               )}
           </CardContent>
         </Card>
      </section>

       {/* Planned Features Alert - Removed for cleaner UI */}
       {/* <Alert className="mb-8 border-blue-500 dark:border-blue-400"> ... </Alert> */}


      {/* Task List Section */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h2 className="text-2xl font-semibold">Your Tasks</h2>
           {/* Add Task Dialog Trigger moved to header */}
        </div>

         {/* Filters and View Options */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 flex-wrap">
             <div className="flex items-center gap-2 flex-wrap"> {/* Filters Group */}
                <Tabs value={filterOption} onValueChange={(value) => setFilterOption(value as FilterOption)}>
                    <TabsList className="h-9">
                        <TabsTrigger value="incomplete" className="text-xs px-2 h-7">Incomplete</TabsTrigger>
                        <TabsTrigger value="completed" className="text-xs px-2 h-7">Completed</TabsTrigger>
                        <TabsTrigger value="all" className="text-xs px-2 h-7">All</TabsTrigger>
                    </TabsList>
                </Tabs>
                 {uniqueCategories.length > 1 && ( // Only show category filter if there are categories
                     <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value)}>
                         <SelectTrigger className="w-auto md:w-[160px] h-9 text-xs">
                              <Tag className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>
                             <SelectValue placeholder="Filter by Category" />
                         </SelectTrigger>
                         <SelectContent>
                             {uniqueCategories.map((category) => (
                                 <SelectItem key={category} value={category} className="text-xs">
                                     {category === 'all' ? 'All Categories' : category}
                                 </SelectItem>
                             ))}
                         </SelectContent>
                     </Select>
                 )}
            </div>

             <div className="flex items-center gap-2"> {/* Sort and View Group */}
                <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                    <SelectTrigger className="w-auto md:w-[160px] h-9 text-xs">
                        <ListFilter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>
                        <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="deadline" className="text-xs">Sort by Deadline</SelectItem>
                        <SelectItem value="priority" className="text-xs">Sort by Priority</SelectItem>
                        <SelectItem value="title" className="text-xs">Sort by Title</SelectItem>
                        <SelectItem value="category" className="text-xs">Sort by Category</SelectItem>
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
        {isLoading && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto"/></div>}
        {error && <Alert variant="destructive" className="my-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Failed to load tasks: {error.message}</AlertDescription>
                    </Alert>}
        {!isLoading && !error && (
            filteredAndSortedTasks.length > 0 ? (
             <div className={cn(
                 "gap-4 transition-all duration-300", // Added transition
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
            <div className="text-center text-muted-foreground mt-8 border border-dashed rounded-lg p-12">
               <p className="font-semibold text-lg">
                   {tasks.length === 0 ? 'No tasks yet!' : 'No tasks match your current filters.'}
               </p>
                {tasks.length === 0 ? (
                     <p className="text-sm mt-2">Click "Add Task" in the header to get started!</p>
                ) : (
                     <p className="text-sm mt-2">Try adjusting the status or category filters.</p>
                )}
                 <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => { setFilterOption('all'); setCategoryFilter('all'); }}>
                    Reset Filters
                </Button>
            </div>
          )
        )}
      </section>
    </div>
  );
}

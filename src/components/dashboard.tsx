
"use client";

import type * as React from "react";
import { useState, useMemo, useEffect } from "react"; // Added useEffect
import { formatDistanceToNow } from "date-fns"; // Added formatDistanceToNow
import { Timestamp, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, onSnapshot, orderBy, writeBatch } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ListFilter, LayoutGrid, List, Info, Tag, Loader2, AlertCircle, CheckCircle, CalendarDays } from "lucide-react"; // Changed Calendar to CalendarDays
import { Button } from "@/components/ui/button";
import { AddTaskForm } from "@/components/add-task-form";
import { TaskCard } from "@/components/task-card";
import type { Task, TaskPriority, TaskDocument, TaskInputData } from "@/types/task";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"; // Added CardFooter
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/lib/firebase"; // Import Firestore instance
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle"; // Import ThemeToggle
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { AuthButton } from "@/components/auth-button";

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
            // Basic validation/defaults
            const deadline = data.deadline instanceof Timestamp ? data.deadline.toDate() : new Date();
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined;

            return {
              id: doc.id,
              title: data.title || 'Untitled Task',
              description: data.description || undefined,
              deadline: deadline,
              priority: data.priority || 'medium',
              completed: data.completed || false,
              category: data.category || undefined,
              createdAt: createdAt,
            };
          });
          resolve(tasksData);
        }, (error) => {
          console.error("Error fetching tasks:", error);
          reject(new Error(`Failed to fetch tasks: ${error.message}`)); // Provide more context
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
    if (!id) {
        throw new Error("Task ID is missing for update.");
    }
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, {
      ...dataToUpdate,
      deadline: Timestamp.fromDate(dataToUpdate.deadline), // Convert Date back to Timestamp
      category: dataToUpdate.category || "", // Ensure category is updated (or empty string)
    });
};

const toggleTaskCompleteMutation = async ({ id, completed }: { id: string; completed: boolean }): Promise<void> => {
    if (!id) {
        throw new Error("Task ID is missing for toggle complete.");
    }
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, { completed });
};

const deleteTaskMutation = async (id: string): Promise<void> => {
    if (!id) {
        throw new Error("Task ID is missing for delete.");
    }
    const taskRef = doc(db, "tasks", id);
    await deleteDoc(taskRef);
};

// --- Dashboard Component ---

export function Dashboard() {
  const { data: tasks = [], isLoading, error } = useTasks();
  const [isMounted, setIsMounted] = useState(false); // State to track client-side mounting
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('deadline');
  const [filterOption, setFilterOption] = useState<FilterOption>('incomplete');
  const [viewOption, setViewOption] = useState<ViewOption>('list');
  const [categoryFilter, setCategoryFilter] = useState<string>('all'); // State for category filter

  const queryClient = useQueryClient();
  const { toast } = useToast();

   // Ensure component is mounted on the client before rendering potentially mismatched content
   useEffect(() => {
    setIsMounted(true);
  }, []);


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
      toast({ title: "Error", description: `Failed to add task: ${err instanceof Error ? err.message : 'Unknown error'}`, variant: "destructive" });
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
      toast({ title: "Error", description: `Failed to update task: ${err instanceof Error ? err.message : 'Unknown error'}`, variant: "destructive" });
    },
  });

   const { mutate: toggleComplete, isPending: isTogglingComplete } = useMutation({
    mutationFn: toggleTaskCompleteMutation,
     onSuccess: (_, variables) => {
        // Optimistic update can be added here if desired
        queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Refetch to confirm
        toast({ title: "Status Updated", description: `Task marked as ${variables.completed ? 'complete' : 'incomplete'}.` });
     },
     onMutate: async ({ id, completed }) => {
        // Optional: Optimistic update
        await queryClient.cancelQueries({ queryKey: ['tasks'] })
        const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])
        queryClient.setQueryData<Task[]>(['tasks'], old =>
          old?.map(task => task.id === id ? { ...task, completed } : task) ?? []
        )
        return { previousTasks }
      },
      onError: (err, _, context) => {
        // Optional: Rollback on error
        if (context?.previousTasks) {
            queryClient.setQueryData(['tasks'], context.previousTasks)
        }
        console.error("Error toggling task:", err);
        toast({ title: "Error", description: `Failed to update task status: ${err instanceof Error ? err.message : 'Unknown error'}`, variant: "destructive" });
      },
      onSettled: () => {
        // Optional: Always refetch after optimistic update attempt
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }
  });

  const { mutate: deleteTask, isPending: isDeletingTask } = useMutation({
     mutationFn: deleteTaskMutation,
     onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Success", description: "Task deleted successfully." });
    },
    onError: (err) => {
      console.error("Error deleting task:", err);
      toast({ title: "Error", description: `Failed to delete task: ${err instanceof Error ? err.message : 'Unknown error'}`, variant: "destructive" });
    },
  });

  // --- Event Handlers ---
  const handleAddTaskSubmit = (data: TaskInputData) => {
    addTask(data);
  };

  const handleEditTaskSubmit = (data: TaskInputData) => {
    if (!editingTask?.id) {
      toast({ title: "Error", description: "Cannot update task without an ID.", variant: "destructive" });
      return;
    };
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
  const overdueTasksCount = useMemo(() => tasks.filter(task => !task.completed && new Date() > task.deadline).length, [tasks]);


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

      // Handle potential invalid dates gracefully during sort
       const deadlineA = a.deadline instanceof Date ? a.deadline.getTime() : 0;
       const deadlineB = b.deadline instanceof Date ? b.deadline.getTime() : 0;


      switch (sortOption) {
        case 'deadline':
          return deadlineA - deadlineB;
        case 'priority':
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return deadlineA - deadlineB; // Secondary sort by deadline
        case 'title':
          return a.title.localeCompare(b.title);
        case 'category': // Sort by category, then by deadline
           const catA = a.category || '';
           const catB = b.category || '';
           if (catA !== catB) return catA.localeCompare(catB);
           return deadlineA - deadlineB;
        default:
          // Ensure createdAt is valid before comparing
          const createdAtA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const createdAtB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return createdAtB - createdAtA; // Default sort: newest first
      }
    });
  }, [tasks, sortOption, filterOption, categoryFilter]);

  const isSubmitting = isAddingTask || isUpdatingTask; // Combine loading states
  const currentActionLoading = isTogglingComplete || isDeletingTask; // Loading for toggle/delete

  if (!isMounted) {
     // Optional: Render a basic loading shell or null during server render/initial mount
     // This helps prevent hydration mismatches if isMounted affects layout significantly
     return (
        <div className="container mx-auto p-4 md:p-8">
           <Skeleton className="h-10 w-1/3 mb-2" />
           <Skeleton className="h-4 w-1/2 mb-8" />
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
            </div>
            <Skeleton className="h-10 w-1/4 mb-4" />
            <Skeleton className="h-10 w-full mb-6" />
             <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
        </div>
     );
  }


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
                     <Button disabled={isLoading || isSubmitting} size="sm">
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                         {editingTask ? 'Edit Task' : 'Add Task'}
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
             <AuthButton />
            <ThemeToggle />
        </div>
      </header>

       {/* Stats Section */}
      <section className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incomplete</CardTitle>
            <List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-1/2" /> : incompleteTasksCount}</div>
             <div className="text-xs text-muted-foreground mt-1">
                {isLoading ? <Skeleton className="h-3 w-2/3" /> : `${completedTasks} completed`}
             </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
             <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{isLoading ? <Skeleton className="h-8 w-1/3" /> : `${completionRate}%`}</div>
             {isLoading ? <Skeleton className="h-4 w-full" /> : <Progress value={completionRate} aria-label={`${completionRate}% tasks completed`} />}
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-destructive">{isLoading ? <Skeleton className="h-8 w-1/2" /> : overdueTasksCount}</div>
              <div className="text-xs text-muted-foreground mt-1">
                 {isLoading ? <Skeleton className="h-3 w-3/4" /> : `Tasks past deadline`}
              </div>
           </CardContent>
         </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
               <CalendarDays className="h-4 w-4 text-muted-foreground" /> {/* Use CalendarDays */}
           </CardHeader>
           <CardContent>
               {isLoading ? (
                   <div className="space-y-2">
                     <Skeleton className="h-3 w-full" />
                     <Skeleton className="h-3 w-5/6" />
                     <Skeleton className="h-3 w-2/3" />
                  </div>
               ) : upcomingTasks.length > 0 ? (
                   <ul className="space-y-1 text-xs text-muted-foreground">
                   {upcomingTasks.map(task => (
                       <li key={task.id} className="flex justify-between items-center gap-2">
                       <span className="truncate">{task.title}</span>
                       <span className="flex-shrink-0 whitespace-nowrap">
                          {isMounted ? formatDistanceToNow(task.deadline, { addSuffix: true }) : <Skeleton className="h-3 w-12 inline-block" />}
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
                        <TabsTrigger value="incomplete" className="text-xs px-2 h-7" disabled={isLoading}>Incomplete</TabsTrigger>
                        <TabsTrigger value="completed" className="text-xs px-2 h-7" disabled={isLoading}>Completed</TabsTrigger>
                        <TabsTrigger value="all" className="text-xs px-2 h-7" disabled={isLoading}>All</TabsTrigger>
                    </TabsList>
                </Tabs>
                 {uniqueCategories.length > 1 && ( // Only show category filter if there are categories
                     <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value)} disabled={isLoading}>
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
                <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)} disabled={isLoading}>
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
                        <TabsTrigger value="list" className="h-7" disabled={isLoading}><List className="h-4 w-4"/></TabsTrigger>
                        <TabsTrigger value="grid" className="h-7" disabled={isLoading}><LayoutGrid className="h-4 w-4"/></TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>


        {/* Task Display Area */}
        {isLoading && (
             <div className={cn(
                 "gap-4",
                  viewOption === 'list' ? "space-y-4" : "grid sm:grid-cols-2 lg:grid-cols-3" // Adjusted grid for sm
              )}>
                 {[...Array(viewOption === 'list' ? 3 : 6)].map((_, i) => ( // Show more skeletons for grid
                    <Card key={i} className={cn(viewOption === 'list' ? "flex flex-col sm:flex-row" : "flex flex-col")}>
                        <CardHeader className={cn("flex items-start space-x-4 p-4", viewOption === 'list' && "flex-shrink-0 sm:w-auto sm:max-w-[40%] border-b sm:border-b-0 sm:border-r")}>
                           <Skeleton className="h-4 w-4 rounded-sm mt-1 flex-shrink-0"/>
                           <div className="flex-1 space-y-1.5 min-w-0">
                             <Skeleton className="h-5 w-3/4" />
                              {viewOption === 'grid' && <Skeleton className="h-3 w-full" />}
                              {viewOption === 'grid' && <Skeleton className="h-3 w-5/6" />}
                           </div>
                        </CardHeader>
                        <CardContent className={cn("flex-1 flex flex-col p-4", viewOption === 'list' ? "justify-between" : "pt-0")}>
                             {viewOption === 'list' && <Skeleton className="h-3 w-24 mb-3" />}
                            <CardFooter className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center p-0 gap-3 text-xs", viewOption === 'list' ? "mt-auto pt-4 border-t sm:border-t-0" : "mt-4 pt-4 border-t")}>
                               <div className="flex flex-wrap items-center gap-x-3 gap-y-1 w-full sm:w-auto">
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                    <Skeleton className="h-5 w-12 rounded-full" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <div className="flex items-center space-x-1 self-end sm:self-center mt-2 sm:mt-0 flex-shrink-0">
                                     <Skeleton className="h-7 w-7 rounded" />
                                     <Skeleton className="h-7 w-7 rounded" />
                                </div>
                            </CardFooter>
                        </CardContent>
                    </Card>
                 ))}
             </div>
        )}
        {error && <Alert variant="destructive" className="my-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Tasks</AlertTitle>
                    <AlertDescription>{error.message || "An unknown error occurred."}</AlertDescription>
                    </Alert>}
        {!isLoading && !error && (
            filteredAndSortedTasks.length > 0 ? (
             <div className={cn(
                 "gap-4 transition-all duration-300", // Added transition
                  viewOption === 'list' ? "space-y-4" : "grid sm:grid-cols-2 lg:grid-cols-3" // Adjusted grid for sm
              )}>
                  {filteredAndSortedTasks.map(task => (
                  <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onEdit={startEditTask}
                      onDelete={handleDeleteTask}
                      viewMode={viewOption}
                      isUpdating={currentActionLoading} // Pass loading state for individual actions
                  />
                  ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground mt-8 border border-dashed rounded-lg p-12 flex flex-col items-center">
                <Info className="h-10 w-10 text-muted-foreground mb-4" />
               <p className="font-semibold text-lg">
                   {tasks.length === 0 ? 'No tasks yet!' : 'No tasks match your current filters.'}
               </p>
                {tasks.length === 0 ? (
                     <p className="text-sm mt-2 max-w-xs">Click the "Add Task" button in the header to create your first task and get started!</p>
                ) : (
                     <p className="text-sm mt-2 max-w-xs">Try adjusting the status or category filters above, or add more tasks.</p>
                )}
                 <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => { setFilterOption('incomplete'); setCategoryFilter('all'); setSortOption('deadline') }}>
                    Reset Filters & Sort
                </Button>
            </div>
          )
        )}
      </section>
    </div>
  );
}

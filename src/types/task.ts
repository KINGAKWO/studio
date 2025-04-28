export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: Date;
  priority: TaskPriority;
  completed: boolean;
  category?: string; // Optional, as per initial spec but not core features
}

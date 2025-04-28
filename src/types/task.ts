import type { Timestamp } from 'firebase/firestore';

export type TaskPriority = 'low' | 'medium' | 'high';

// For data fetched from Firestore
export interface TaskDocument {
  id: string;
  title: string;
  description?: string;
  deadline: Timestamp; // Firestore uses Timestamps
  priority: TaskPriority;
  completed: boolean;
  category?: string; // Added category field
  createdAt?: Timestamp; // Optional: track creation time
}

// For data used in the UI (deadline converted to Date)
export interface Task extends Omit<TaskDocument, 'deadline' | 'createdAt'> {
  deadline: Date;
  createdAt?: Date; // Convert Timestamp to Date if present
}

// For data used when creating/updating (deadline can be Date)
export interface TaskInputData extends Omit<TaskDocument, 'id' | 'deadline' | 'completed' | 'createdAt'> {
  deadline: Date;
  category?: string; // Added category field
}
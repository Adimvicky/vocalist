export interface Task {
  _id?: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  text: string;
}

export interface UpdateTaskInput {
  completed?: boolean;
  text?: string;
}

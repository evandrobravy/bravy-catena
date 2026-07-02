export interface ClickUpUser {
  id: number;
  username: string;
  email?: string;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  type_config?: {
    options?: Array<{ id: string; name?: string; label?: string }>;
  };
  value?: unknown;
}

export interface ClickUpStatus {
  status: string;
  type?: string;
}

export interface ClickUpTask {
  id: string;
  name: string;
  status: ClickUpStatus;
  date_created?: string;
  date_updated?: string;
  due_date?: string | null;
  start_date?: string | null;
  date_done?: string | null;
  date_closed?: string | null;
  assignees?: ClickUpUser[];
  custom_fields?: ClickUpCustomField[];
  list?: { id: string; name?: string };
}

export interface ClickUpTasksResponse {
  tasks: ClickUpTask[];
  last_page?: boolean;
}

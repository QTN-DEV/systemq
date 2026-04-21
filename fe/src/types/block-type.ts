export type BlockStatus = "triage" | "backlog" | "todo" | "inprogress" | "done";

export interface Block {
  id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: BlockStatus;
  start_date: string | null;
  deadline: string | null;
  assignees: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  children?: Block[];
}

export interface BlockComment {
  id: string;
  block_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface BlockHistory {
  id: string;
  block_id: string;
  changed_by_id: string;
  changed_by_name: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

export interface BlockCreatePayload {
  parent_id?: string | null;
  title: string;
  description?: string | null;
  status?: BlockStatus;
  start_date?: string | null;
  deadline?: string | null;
  assignees?: string[];
}

export interface BlockUpdatePayload {
  parent_id?: string | null;
  title?: string;
  description?: string | null;
  status?: BlockStatus;
  start_date?: string | null;
  deadline?: string | null;
  assignees?: string[];
}

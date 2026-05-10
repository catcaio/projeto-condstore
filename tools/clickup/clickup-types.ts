/**
 * ClickUp API Types
 */

export interface ClickUpWorkspace {
  id: string;
  name: string;
  members: Array<{
    user: {
      id: number;
      username: string;
      email: string;
    };
  }>;
}

export interface ClickUpSpace {
  id: string;
  name: string;
  private: boolean;
  statuses: Array<{
    status: string;
    type: string;
    orderindex: number;
    color: string;
  }>;
  multiple_assignees: boolean;
}

export interface ClickUpFolder {
  id: string;
  name: string;
  orderindex: number;
  override_statuses?: boolean;
  hidden: boolean;
  space: {
    id: string;
    name: string;
  };
}

export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  status?: string;
  priority?: {
    priority: string;
    color: string;
  };
  assignee?: any;
  task_count?: number;
  folder?: {
    id: string;
    name: string;
  };
  space: {
    id: string;
    name: string;
  };
}

export interface ClickUpTask {
  id: string;
  custom_id?: string;
  name: string;
  description?: string;
  status: {
    status: string;
    color: string;
    orderindex: number;
    type: string;
  };
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed?: string;
  creator: {
    id: number;
    username: string;
    email: string;
  };
  assignees: Array<{
    id: number;
    username: string;
    email: string;
  }>;
  list: {
    id: string;
    name: string;
  };
  folder: {
    id: string;
    name: string;
  };
  space: {
    id: string;
  };
  url: string;
  priority?: {
    priority: string;
    color: string;
  };
}

export interface ClickUpComment {
  id: string;
  comment_text: string;
  user: {
    id: number;
    username: string;
  };
  date: string;
}

export interface ClickUpDoc {
  id: string;
  name: string;
  content?: string;
}

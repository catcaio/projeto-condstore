import { clickupConfig, validateConfig } from './clickup-config';
import { clickupLogger } from './clickup-logger';
import { clickupGuards } from './clickup-guards';

export class ClickUpClient {
  constructor() {
    validateConfig();
  }

  private async request(method: string, endpoint: string, body?: any) {
    const url = `${clickupConfig.apiUrl}${endpoint}`;
    const headers = {
      'Authorization': clickupConfig.apiToken,
      'Content-Type': 'application/json'
    };

    const options: any = {
      method,
      headers
    };

    if (body && ['POST', 'PUT'].includes(method)) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      clickupLogger.error(`API Error: ${method} ${endpoint}`, data);
      throw new Error(`ClickUp API Error: ${data.err || response.statusText}`);
    }

    return data;
  }

  // --- Auth & Teams ---
  async getTeams() {
    return this.request('GET', '/team');
  }

  // --- Spaces ---
  async getSpaces(teamId: string = clickupConfig.workspaceId) {
    return this.request('GET', `/team/${teamId}/space`);
  }

  // --- Folders ---
  async getFolders(spaceId: string) {
    return this.request('GET', `/space/${spaceId}/folder`);
  }

  async createFolder(spaceId: string, name: string) {
    if (!clickupGuards.shouldExecute(`Create Folder: ${name}`)) return null;
    return this.request('POST', `/space/${spaceId}/folder`, { name });
  }

  // --- Lists ---
  async getLists(folderId: string) {
    return this.request('GET', `/folder/${folderId}/list`);
  }

  async createList(folderId: string, name: string) {
    if (!clickupGuards.shouldExecute(`Create List: ${name}`)) return null;
    return this.request('POST', `/folder/${folderId}/list`, { name });
  }

  async updateList(listId: string, data: { name?: string, status?: string, priority?: number }) {
    if (!clickupGuards.shouldExecute(`Update List: ${listId}`)) return null;
    return this.request('PUT', `/list/${listId}`, data);
  }

  // --- Tasks ---
  async getTasks(listId: string, archived = false) {
    return this.request('GET', `/list/${listId}/task?archived=${archived}`);
  }

  async getTask(taskId: string) {
    return this.request('GET', `/task/${taskId}`);
  }

  async createTask(listId: string, data: {
    name: string;
    description?: string;
    assignees?: number[];
    status?: string;
    priority?: number;
    due_date?: number;
    start_date?: number;
  }) {
    if (!clickupGuards.shouldExecute(`Create Task: ${data.name}`)) return null;
    return this.request('POST', `/list/${listId}/task`, data);
  }

  async updateTask(taskId: string, data: any) {
    if (!clickupGuards.shouldExecute(`Update Task: ${taskId}`)) return null;
    return this.request('PUT', `/task/${taskId}`, data);
  }

  // --- Comments ---
  async createTaskComment(taskId: string, comment_text: string) {
    if (!clickupGuards.shouldExecute(`Create Comment on Task: ${taskId}`)) return null;
    return this.request('POST', `/task/${taskId}/comment`, { comment_text });
  }

  // --- Destructive (Guarded) ---
  async deleteTask(taskId: string) {
    if (!clickupGuards.allowDestructive(`Delete Task: ${taskId}`)) return null;
    return this.request('DELETE', `/task/${taskId}`);
  }
}

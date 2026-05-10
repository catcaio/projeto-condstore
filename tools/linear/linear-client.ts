import { linearConfig, validateLinearConfig } from './linear-config';
import { clickupLogger as linearLogger } from '../clickup/clickup-logger';

export class LinearClient {
  constructor() {
    validateLinearConfig();
  }

  private async request(query: string, variables: any = {}) {
    const response = await fetch(linearConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': linearConfig.apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });

    const data = await response.json();

    if (data.errors) {
      linearLogger.error('Linear API Errors:', data.errors);
      throw new Error(`Linear API Error: ${data.errors[0].message}`);
    }

    return data.data;
  }

  async getViewer() {
    const query = `
      query {
        viewer {
          id
          name
          email
        }
      }
    `;
    return this.request(query);
  }

  async getTeams() {
    const query = `
      query {
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    `;
    return this.request(query);
  }

  async createIssue(teamId: string, input: {
    title: string;
    description?: string;
    priority?: number;
    stateId?: string;
  }) {
    const query = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            url
          }
        }
      }
    `;
    return this.request(query, { input: { ...input, teamId } });
  }

  async getStates(teamId: string) {
    const query = `
      query GetStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
              type
            }
          }
        }
      }
    `;
    return this.request(query, { teamId });
  }

  async updateIssue(issueId: string, input: any) {
    const query = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            state {
              name
            }
          }
        }
      }
    `;
    return this.request(query, { id: issueId, input });
  }

  async getIssueByIdentifier(identifier: string) {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
        }
      }
    `;
    return this.request(query, { id: identifier });
  }
}

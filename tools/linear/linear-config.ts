import { clickupLogger as linearLogger } from '../clickup/clickup-logger';

export const linearConfig = {
  apiToken: process.env.LINEAR_API_TOKEN || '',
  apiUrl: 'https://api.linear.app/graphql'
};

export function validateLinearConfig() {
  if (!linearConfig.apiToken) {
    throw new Error('LINEAR_API_TOKEN is missing in .env.local');
  }
}

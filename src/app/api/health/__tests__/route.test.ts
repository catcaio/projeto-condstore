import { GET, POST, PUT, PATCH, DELETE } from '../route';
import { describe, it, expect } from 'vitest';

describe('Health Route', () => {
  it('should return exactly { status: "ok" } with 200 status code', async () => {
    const response = await GET();
    const body = await response.json();
    
    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'ok' });
    
    // Ensure no other keys are exposed (e.g. env variables, db details)
    expect(Object.keys(body)).toHaveLength(1);
    expect(Object.keys(body)).toContain('status');
  });

  it('should reject POST, PUT, PATCH, DELETE with 405', async () => {
    const methods = [POST, PUT, PATCH, DELETE];
    
    for (const method of methods) {
      const response = await method();
      expect(response.status).toBe(405);
      
      const body = await response.json();
      expect(body).toEqual({ error: 'Method Not Allowed' });
      expect(response.headers.get('Allow')).toBe('GET');
    }
  });
});


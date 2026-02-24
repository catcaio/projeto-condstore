const DEFAULT_QDRANT_URL = 'http://127.0.0.1:6333';
const DEFAULT_QDRANT_COLLECTION = 'condstore_docs';
const QDRANT_TIMEOUT_MS = 5000;

interface QdrantRequestOptions {
  method?: 'GET' | 'PUT' | 'POST';
  body?: unknown;
}

export interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface QdrantSearchFilter {
  must?: Array<Record<string, unknown>>;
  should?: Array<Record<string, unknown>>;
  must_not?: Array<Record<string, unknown>>;
}

function getQdrantUrl(): string {
  return (process.env.QDRANT_URL || DEFAULT_QDRANT_URL).replace(/\/$/, '');
}

export function getQdrantCollectionName(): string {
  return process.env.QDRANT_COLLECTION || DEFAULT_QDRANT_COLLECTION;
}

function getQdrantApiKey(): string | undefined {
  const key = process.env.QDRANT_API_KEY?.trim();
  return key ? key : undefined;
}

function buildHeaders(hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasBody) headers['content-type'] = 'application/json';
  const apiKey = getQdrantApiKey();
  if (apiKey) headers['api-key'] = apiKey;
  return headers;
}

async function qdrantRequest(path: string, options: QdrantRequestOptions = {}) {
  const url = `${getQdrantUrl()}${path}`;
  const hasBody = options.body !== undefined;
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: buildHeaders(hasBody),
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(QDRANT_TIMEOUT_MS),
  });
  return response;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => '');
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function qdrantHealth(): Promise<{ ok: boolean; status: number; body?: unknown }> {
  const response = await qdrantRequest('/healthz', { method: 'GET' });
  const parsed = await parseJsonResponse(response);

  return {
    ok: response.ok,
    status: response.status,
    body: parsed,
  };
}

export async function upsertPoints(collection: string, points: QdrantPoint[]): Promise<{ status: number; body?: unknown }> {
  const path = `/collections/${encodeURIComponent(collection)}/points?wait=true`;
  const bodyPayload = { points };

  let response = await qdrantRequest(path, { method: 'POST', body: bodyPayload });
  let body = await parseJsonResponse(response);

  // Some Qdrant builds accept this payload only on PUT for /points.
  if (!response.ok && response.status === 400) {
    response = await qdrantRequest(path, { method: 'PUT', body: bodyPayload });
    body = await parseJsonResponse(response);
  }

  if (!response.ok) {
    throw new Error(`Qdrant upsertPoints failed (${response.status}): ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }

  return { status: response.status, body };
}

export async function searchPoints(
  collection: string,
  vector: number[],
  filter?: QdrantSearchFilter,
  limit = 10,
): Promise<{ status: number; body?: unknown }> {
  const response = await qdrantRequest(
    `/collections/${encodeURIComponent(collection)}/points/search`,
    {
      method: 'POST',
      body: {
        vector,
        limit,
        with_payload: true,
        ...(filter ? { filter } : {}),
      },
    },
  );

  const body = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Qdrant searchPoints failed (${response.status}): ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }

  return { status: response.status, body };
}

export async function countPoints(
  collection: string,
  filter?: QdrantSearchFilter,
  exact = true,
): Promise<{ status: number; body?: unknown }> {
  const response = await qdrantRequest(
    `/collections/${encodeURIComponent(collection)}/points/count`,
    {
      method: 'POST',
      body: {
        exact,
        ...(filter ? { filter } : {}),
      },
    },
  );

  const body = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Qdrant countPoints failed (${response.status}): ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }

  return { status: response.status, body };
}

export async function getCollectionInfo(collection: string): Promise<{ status: number; body?: unknown }> {
  const response = await qdrantRequest(`/collections/${encodeURIComponent(collection)}`, { method: 'GET' });
  const body = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Qdrant getCollectionInfo failed (${response.status}): ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return { status: response.status, body };
}

export async function ensureCollection(name?: string): Promise<{ ensured: boolean; collection: string }> {
  const collection = name || getQdrantCollectionName();

  const getRes = await qdrantRequest(`/collections/${encodeURIComponent(collection)}`, { method: 'GET' });
  if (getRes.ok) {
    return { ensured: false, collection };
  }
  if (getRes.status !== 404) {
    const errBody = await getRes.text().catch(() => '');
    throw new Error(`Qdrant collection check failed (${getRes.status}): ${errBody || 'unknown error'}`);
  }

  const putRes = await qdrantRequest(`/collections/${encodeURIComponent(collection)}`, {
    method: 'PUT',
    body: {
      vectors: {
        size: 768,
        distance: 'Cosine',
      },
    },
  });

  if (putRes.ok || putRes.status === 409) {
    return { ensured: putRes.ok, collection };
  }

  const putBody = await putRes.text().catch(() => '');
  throw new Error(`Qdrant ensureCollection failed (${putRes.status}): ${putBody || 'unknown error'}`);
}

export function getQdrantConfig() {
  return {
    url: getQdrantUrl(),
    collection: getQdrantCollectionName(),
    hasApiKey: Boolean(getQdrantApiKey()),
  };
}

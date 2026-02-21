import fs from 'fs';
import path from 'path';

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: number;
}

const getStorePath = () => {
    // Basic fallback to local tmp if not provided
    const dir = process.env.DATA_DIR || path.join(process.cwd(), '.data');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'users.json');
};

let memoryStore: Record<string, User> | null = null;

function readStore(): Record<string, User> {
    if (memoryStore) return memoryStore;

    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
        try {
            const data = fs.readFileSync(storePath, 'utf8');
            memoryStore = JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse users.json, falling back to empty memory store', e);
            memoryStore = {};
        }
    } else {
        memoryStore = {};
    }

    return memoryStore!;
}

function writeStore(store: Record<string, User>) {
    memoryStore = store;
    try {
        const storePath = getStorePath();
        fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to write users.json', e);
    }
}

export async function createUser(id: string, email: string, passwordHash: string): Promise<User> {
    const store = readStore();

    const existingUser = Object.values(store).find(u => u.email === email);
    if (existingUser) {
        throw new Error('User already exists');
    }

    const newUser: User = {
        id,
        email,
        passwordHash,
        createdAt: Date.now()
    };

    store[id] = newUser;
    writeStore(store);
    return newUser;
}

export async function findUserByEmail(email: string): Promise<User | null> {
    const store = readStore();
    return Object.values(store).find(u => u.email === email) || null;
}

export async function findUserById(id: string): Promise<User | null> {
    const store = readStore();
    return store[id] || null;
}

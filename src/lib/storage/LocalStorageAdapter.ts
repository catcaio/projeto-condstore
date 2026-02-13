import { Simulation } from '../../types/freight';
import { StorageAdapter } from './adapter';

export class LocalStorageAdapter implements StorageAdapter {
    private readonly STORAGE_KEY = 'painel_logistico_history';

    saveSimulation(simulation: Simulation): void {
        if (typeof window === 'undefined') return;

        const current = this.getSimulations();
        const updated = [simulation, ...current].slice(0, 10); // Keep last 10

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Error saving simulation history:', error);
        }
    }

    getSimulations(): Simulation[] {
        if (typeof window === 'undefined') return [];

        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading simulation history:', error);
            return [];
        }
    }

    clearHistory(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.STORAGE_KEY);
    }
}

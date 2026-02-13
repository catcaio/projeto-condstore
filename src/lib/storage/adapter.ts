import { Simulation } from '../../types/freight';

export interface StorageAdapter {
    saveSimulation(simulation: Simulation): void;
    getSimulations(): Simulation[];
    clearHistory(): void;
}

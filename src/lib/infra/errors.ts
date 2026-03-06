export class LockAcquisitionError extends Error {
  constructor(public readonly key: string) {
    super(`Failed to acquire distributed lock for key: ${key}`);
    this.name = 'LockAcquisitionError';
  }
}

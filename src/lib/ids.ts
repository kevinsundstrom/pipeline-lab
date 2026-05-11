import { randomBytes } from 'crypto';

export function generateRunId(): string {
  return `run_${randomBytes(6).toString('hex')}`;
}

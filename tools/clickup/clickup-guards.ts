import { clickupConfig } from './clickup-config';
import { clickupLogger } from './clickup-logger';

export const clickupGuards = {
  /**
   * Returns true if the operation should proceed (not dry run).
   * Logs a message if it's a dry run.
   */
  shouldExecute: (operation: string): boolean => {
    if (clickupConfig.isDryRun) {
      clickupLogger.dryRun(`Skipping [${operation}] due to CLICKUP_DRY_RUN=true`);
      return false;
    }
    return true;
  },

  /**
   * Returns true if destructive operation is allowed.
   * Throws or logs error if not allowed.
   */
  allowDestructive: (operation: string): boolean => {
    if (!clickupConfig.allowDestructive) {
      clickupLogger.error(`Operation [${operation}] BLOCKED: CLICKUP_ALLOW_DESTRUCTIVE is false.`);
      return false;
    }
    if (clickupConfig.isDryRun) {
      clickupLogger.dryRun(`Destructive operation [${operation}] would execute if not in DRY_RUN.`);
      return false;
    }
    return true;
  }
};

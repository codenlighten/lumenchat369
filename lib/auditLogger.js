/**
 * Audit Logger - Logs all terminal command executions for security and compliance
 * 
 * Tracks:
 * - Commands executed (successful and failed)
 * - Approval decisions
 * - Execution results and timing
 * - Security policy evaluations
 */

import { appendFile } from 'fs/promises';
import { join } from 'path';

const LOG_FILE = join(process.cwd(), 'audit.log');

/**
 * Log a command execution event
 * @param {object} commandResult - Result from executeAgentCommand
 * @returns {Promise<void>}
 */
export async function logCommand(commandResult) {
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    status: commandResult.status,
    command: commandResult.command || commandResult.terminalCommand || 'N/A',
    reasoning: commandResult.reasoning || commandResult.commandReasoning || 'N/A',
    ...commandResult
  };

  // Format as JSON line (JSONL)
  const logLine = JSON.stringify(logEntry) + '\n';

  try {
    await appendFile(LOG_FILE, logLine, 'utf8');
  } catch (error) {
    // Fail silently on logging errors to not disrupt command execution
    console.error('⚠️  Audit log write failed:', error.message);
  }
}

/**
 * Log a security event (approval denial, dangerous pattern, etc.)
 * @param {string} eventType - Type of security event
 * @param {object} details - Event details
 */
export async function logSecurityEvent(eventType, details) {
  await logCommand({
    status: 'security-event',
    eventType,
    ...details
  });
}

export default { logCommand, logSecurityEvent };

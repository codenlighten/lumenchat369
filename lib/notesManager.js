/**
 * Notes Manager - Agent's scratch pad for maintaining context across sessions
 * 
 * Manages notes.md file where the agent can:
 * - Track current task and plan
 * - Store discovered context
 * - Mark completed steps
 * - Record blockers
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Get notes file path (supports user-specific files)
 */
function getNotesFile() {
  return process.env.USER_NOTES_FILE || path.join(process.cwd(), 'notes.md');
}

/**
 * Initialize or load notes
 */
export async function loadNotes() {
  try {
    const content = await fs.readFile(getNotesFile(), 'utf-8');
    return content;
  } catch (error) {
    // File doesn't exist, return empty structure
    return `# Agent Notes

## Current Task
None

## Plan
No active plan

## Context
- Session started: ${new Date().toISOString()}

## Completed
- Nothing yet

## Blockers
None
`;
  }
}

/**
 * Save notes to file
 */
export async function saveNotes(content) {
  await fs.writeFile(getNotesFile(), content, 'utf-8');
}

/**
 * Update current task section
 */
export async function updateCurrentTask(taskDescription) {
  const notes = await loadNotes();
  const updated = notes.replace(
    /## Current Task\n[^#]*/,
    `## Current Task\n${taskDescription}\n\n`
  );
  await saveNotes(updated);
}

/**
 * Set plan steps
 */
export async function setPlan(steps) {
  const notes = await loadNotes();
  const planText = steps.map((step, idx) => 
    `- [ ] ${idx + 1}. ${step.stepDescription}${step.reasoning ? ` (${step.reasoning})` : ''}`
  ).join('\n');
  
  const updated = notes.replace(
    /## Plan\n[^#]*/,
    `## Plan\n${planText}\n\n`
  );
  await saveNotes(updated);
  return updated;
}

/**
 * Mark a step as completed
 */
export async function completeStep(stepNumber) {
  const notes = await loadNotes();
  const lines = notes.split('\n');
  
  let inPlanSection = false;
  let stepCount = 0;
  
  const updated = lines.map(line => {
    if (line.startsWith('## Plan')) {
      inPlanSection = true;
      return line;
    } else if (line.startsWith('##')) {
      inPlanSection = false;
      return line;
    }
    
    if (inPlanSection && line.trim().startsWith('- [')) {
      stepCount++;
      if (stepCount === stepNumber) {
        return line.replace('- [ ]', '- [x]');
      }
    }
    return line;
  }).join('\n');
  
  await saveNotes(updated);
  return updated;
}

/**
 * Add context information
 */
export async function addContext(contextItem) {
  const notes = await loadNotes();
  const timestamp = new Date().toISOString();
  const contextLine = `- [${timestamp}] ${contextItem}`;
  
  const updated = notes.replace(
    /## Context\n/,
    `## Context\n${contextLine}\n`
  );
  await saveNotes(updated);
}

/**
 * Add completed item
 */
export async function addCompleted(item) {
  const notes = await loadNotes();
  const timestamp = new Date().toISOString();
  const completedLine = `- [${timestamp}] ${item}`;
  
  const updated = notes.replace(
    /## Completed\n/,
    `## Completed\n${completedLine}\n`
  );
  await saveNotes(updated);
}

/**
 * Add blocker
 */
export async function addBlocker(blocker) {
  const notes = await loadNotes();
  const timestamp = new Date().toISOString();
  const blockerLine = `- [${timestamp}] ${blocker}`;
  
  const updated = notes.replace(
    /## Blockers\n/,
    `## Blockers\n${blockerLine}\n`
  );
  await saveNotes(updated);
}

/**
 * Clear notes (start fresh)
 */
export async function clearNotes() {
  const freshNotes = `# Agent Notes

## Current Task
None

## Plan
No active plan

## Context
- Session started: ${new Date().toISOString()}

## Completed
- Nothing yet

## Blockers
None
`;
  await saveNotes(freshNotes);
  return freshNotes;
}

/**
 * Append free-form note
 */
export async function appendNote(section, content) {
  const notes = await loadNotes();
  const sectionPattern = new RegExp(`## ${section}\n`, 'i');
  
  if (sectionPattern.test(notes)) {
    const updated = notes.replace(
      sectionPattern,
      `## ${section}\n${content}\n\n`
    );
    await saveNotes(updated);
  } else {
    // Section doesn't exist, add it
    const updated = notes + `\n## ${section}\n${content}\n`;
    await saveNotes(updated);
  }
}

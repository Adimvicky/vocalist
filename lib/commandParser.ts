export interface ParsedCommand {
  action: 'add' | 'complete' | 'delete' | 'list' | 'unknown';
  target?: string;
  taskText?: string;
}

export function parseCommand(transcript: string): ParsedCommand {
  const lowerTranscript = transcript.toLowerCase().trim();

  // Add task patterns
  const addPatterns = [
    /^add task[:\s]+(.+)$/i,
    /^add[:\s]+(.+)$/i,
    /^create task[:\s]+(.+)$/i,
    /^new task[:\s]+(.+)$/i,
    /^remind me to[:\s]+(.+)$/i,
  ];

  for (const pattern of addPatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      return {
        action: 'add',
        taskText: match[1].trim(),
      };
    }
  }

  // Complete task patterns
  const completePatterns = [
    /^complete[:\s]+(.+)$/i,
    /^finish[:\s]+(.+)$/i,
    /^done[:\s]+(.+)$/i,
    /^mark[:\s]+(.+?)[:\s]+(?:as )?(?:complete|done)$/i,
  ];

  for (const pattern of completePatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      return {
        action: 'complete',
        target: match[1].trim(),
      };
    }
  }

  // Delete task patterns
  const deletePatterns = [
    /^delete[:\s]+(.+)$/i,
    /^remove[:\s]+(.+)$/i,
    /^delete task[:\s]+(.+)$/i,
    /^remove task[:\s]+(.+)$/i,
  ];

  for (const pattern of deletePatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      return {
        action: 'delete',
        target: match[1].trim(),
      };
    }
  }

  // List tasks patterns
  if (
    lowerTranscript.includes('list tasks') ||
    lowerTranscript.includes('show tasks') ||
    lowerTranscript.includes('what are my tasks') ||
    lowerTranscript === 'list' ||
    lowerTranscript === 'show all'
  ) {
    return {
      action: 'list',
    };
  }

  // If no pattern matches, default to adding as a task
  return {
    action: 'add',
    taskText: transcript.trim(),
  };
}

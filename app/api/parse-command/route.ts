import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { command, tasks } = await request.json();

    if (!command) {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      );
    }

    // Format tasks for the prompt
    const taskListText = tasks && tasks.length > 0
      ? tasks.map((t: any) => `- ID: ${t._id}, Text: "${t.text}", Status: ${t.completed ? 'completed' : 'pending'}`).join('\n')
      : 'No tasks available';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a command parser for a voice-controlled to-do list app called VocaList.
Parse user commands and return ONLY valid JSON with action and parameters.

CURRENT TASKS:
${taskListText}

Possible actions:
- "add": Add a new task (requires taskText)
- "addMultiple": Add multiple tasks (requires taskTexts as array of strings)
- "complete": Mark task(s) as complete (requires taskId - can be single string or array of strings)
- "delete": Delete task(s) (requires taskId - can be single string or array of strings)
- "completeAll": Complete all pending tasks
- "deleteCompleted": Delete all completed tasks
- "clearAll": Delete all tasks
- "list": Show all tasks
- "count": Count tasks
- "readTasks": Read all tasks aloud
- "help": Show available commands

Response format examples:
{"action": "add", "taskText": "buy groceries"}
{"action": "addMultiple", "taskTexts": ["buy milk", "buy eggs", "buy bread"]}
{"action": "complete", "taskId": "507f1f77bcf86cd799439011"}
{"action": "complete", "taskId": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]}
{"action": "delete", "taskId": "507f1f77bcf86cd799439011"}
{"action": "delete", "taskId": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]}
{"action": "completeAll"}
{"action": "deleteCompleted"}
{"action": "count"}
{"action": "readTasks"}
{"action": "list"}
{"action": "help"}

IMPORTANT: For complete and delete actions, match the user's command against the CURRENT TASKS list above.
Use semantic matching - if they say "finish groceries" and there's a task "buy groceries", return that task's ID.
If they say "complete the first task" or "delete task 1", use the order in the list.
Be flexible with partial matches and typos.

MULTIPLE TASK MATCHING: If the user's command semantically matches multiple tasks, return ALL matching task IDs as an array.
- If they say "I just cleaned all the rooms" and there are tasks like "clean my room", "clean the living room", "Clean the washroom", return all those task IDs
- If they say "I washed my car" and there are tasks like "wash the car", "wash the blue car", "wash the red car", return all matching task IDs
- If they say "add buy milk, eggs and bread", use addMultiple with all three items

Examples:
- User says: "finish the groceries task"
  Available task: ID: "123", Text: "buy groceries at whole foods"
  Return: {"action": "complete", "taskId": "123"}

- User says: "I just cleaned all the rooms"
  Available tasks: ID: "101", Text: "clean my room"; ID: "102", Text: "clean the living room"; ID: "103", Text: "Clean the washroom"
  Return: {"action": "complete", "taskId": ["101", "102", "103"]}

- User says: "I washed my car"
  Available tasks: ID: "201", Text: "wash the car"; ID: "202", Text: "wash the blue car"; ID: "203", Text: "wash the red car"
  Return: {"action": "complete", "taskId": ["201", "202", "203"]}

- User says: "delete all the washing tasks"
  Available tasks: ID: "301", Text: "wash dishes"; ID: "302", Text: "wash car"
  Return: {"action": "delete", "taskId": ["301", "302"]}

- User says: "add buy milk, eggs and bread"
  Return: {"action": "addMultiple", "taskTexts": ["buy milk", "buy eggs", "buy bread"]}

- User says: "complete first task"
  First task in list: ID: "789", Text: "submit report"
  Return: {"action": "complete", "taskId": "789"}

- User says: "add buy milk"
  Return: {"action": "add", "taskText": "buy milk"}

If no task matches closely enough, return {"action": "unknown", "message": "Could not find matching task"}.

Return ONLY the JSON object, no explanations.`,
        },
        {
          role: 'user',
          content: command,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error parsing command:', error);
    return NextResponse.json(
      { error: 'Failed to parse command' },
      { status: 500 }
    );
  }
}

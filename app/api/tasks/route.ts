import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    const tasks = await db
      .collection('tasks')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      tasks.map((task) => ({
        ...task,
        _id: task._id.toString(),
      }))
    );
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Task text is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const now = new Date();
    const trimmedText = text.trim();
    const capitalizedText = trimmedText.charAt(0).toUpperCase() + trimmedText.slice(1);

    const newTask = {
      text: capitalizedText,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('tasks').insertOne(newTask);

    return NextResponse.json(
      {
        ...newTask,
        _id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

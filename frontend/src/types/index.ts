export interface ProjectFile {
  id: string;
  roomId: string;
  name: string;
  path: string;
  language: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface RoomUser {
  socketId: string;
  id: string;
  name: string;
  color: string;
  currentFileId?: string;
  cursor?: CursorPosition;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  createdAt: string;
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  executionTime: number;
  exitCode: number;
}

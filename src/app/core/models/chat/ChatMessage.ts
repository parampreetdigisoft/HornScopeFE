
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ChatContext {
  program?: string;
  pillar?: string;
}

export interface ProgramChatRequestDto extends GlobalChatRequestDto {
  climateProgramID: number;
  pillarID?: number | null;
}

export interface GlobalChatRequestDto {
  questionText: string;
  fAQID?: number | null;
  historyText: string | null;
}

export interface CrossComparisionChatRequestDto {
  questionText: string;
  climateProgramIDs: number[];
  historyText: string | null;
}

export interface ChatResponseDto {
  climateProgramID: number;
  pillarID?: number | null;
  questionText: string;
  fAQID?: number | null;
  responseText: string;
}
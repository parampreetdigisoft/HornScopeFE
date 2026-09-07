
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ChatContext {
  country?: string;
  pillar?: string;
}

export interface CountryChatRequestDto extends GlobalChatRequestDto {
  countryID: number;
  pillarID?: number | null;
}

export interface GlobalChatRequestDto {
  questionText: string;
  fAQID?: number | null;
  historyText: string | null;
}

export interface CrossComparisionChatRequestDto {
  questionText: string;
  countryIDs: number[];
  historyText: string | null;
}

export interface ChatResponseDto {
  countryID: number;
  pillarID?: number | null;
  questionText: string;
  fAQID?: number | null;
  responseText: string;
}
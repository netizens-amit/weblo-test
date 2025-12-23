export const GENERATION_QUEUE = 'generation';

export interface GenerationJobData {
  projectId: string;
  userId?: string;
  projectName: string;
  prompt: string;
  preferences?: any;
  createdAt: Date;
}

export interface GenerationJobProgress {
  status: 'pending' | 'creating_session' | 'generating' | 'saving_files' | 'completed' | 'failed';
  progress: number;        // 0-100
  currentStep?: string;
  filesGenerated?: string[];
  error?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUSD: number;
  };
}

export interface GenerationJobResult {
  success: boolean;
  files?: string[];
  sessionId?: string;
  error?: string;
  generationTimeMs?: number;
}
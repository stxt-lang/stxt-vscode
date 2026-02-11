export type StxtTokenType = 'comment';

export interface StxtToken {
    line: number;      // 0-based
    startChar: number; // 0-based
    length: number;
    type: StxtTokenType;
}

export interface AnalysisResult {
    tokens: StxtToken[];
}

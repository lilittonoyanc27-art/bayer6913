export interface Question {
  id: number;
  questionEs: string;
  questionAm: string;
  options: string[]; // Options stripped of the "A) ", "B) ", etc., to render nicely
  correctOptionIndex: number; // 0 for A, 1 for B, 2 for C, 3 for D
}

export interface Lifelines {
  fiftyFifty: { used: boolean; active: boolean; disabledOptions: number[] };
  phoneFriend: { used: boolean; active: boolean; recommendation: string | null };
  askAudience: { used: boolean; active: boolean; pollResults: number[] | null };
}

export type GameStatus = "INTRO" | "PLAYING" | "LOCK_IN" | "REVEAL" | "WALK_AWAY" | "GAME_OVER" | "MILLIONAIRE";

export interface FriendOption {
  name: string;
  avatar: string;
  description: string;
  accuracy: number; // 0 to 1
  personality: string;
}

import { API_URL, ApiError } from "@/lib/api";

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status);
  }
  return response.json();
}

export interface Repertoire {
  id: string;
  name: string;
  color: "white" | "black";
  created_at: string;
  updated_at: string;
}

export interface LineSummary {
  id: string;
  repertoire_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  last_practiced_at: string | null;
  practice_attempt_count: number;
  move_count: number;
}

export interface Ply {
  ply_index: number;
  san: string;
  uci: string;
  fen_after: string;
  is_key_position: boolean;
}

export interface Explanation {
  ply_index: number;
  why_move: string | null;
  strategic_idea: string | null;
  plan_text: string | null;
  watch_for: string | null;
  remember_this: string | null;
  content_version: string;
  generated_at: string | null;
}

export interface LineDetail {
  id: string;
  repertoire_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  last_practiced_at: string | null;
  practice_attempt_count: number;
  plies: Ply[];
  explanations: Explanation[];
}

export type OpeningMode = "explore" | "learn" | "practice" | "stress";

export async function fetchRepertoires(): Promise<Repertoire[]> {
  const res = await fetch(`${API_URL}/api/openings/repertoires`);
  return handle(res);
}

export async function createRepertoire(
  name: string,
  color: "white" | "black",
): Promise<Repertoire> {
  const res = await fetch(`${API_URL}/api/openings/repertoires`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  return handle(res);
}

export async function deleteRepertoire(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/openings/repertoires/${id}`, {
    method: "DELETE",
  });
  await handle(res);
}

export async function fetchLines(repertoireId: string): Promise<LineSummary[]> {
  const res = await fetch(
    `${API_URL}/api/openings/repertoires/${repertoireId}/lines`,
  );
  return handle(res);
}

export async function createLine(
  repertoireId: string,
  name: string,
): Promise<LineDetail> {
  const res = await fetch(
    `${API_URL}/api/openings/repertoires/${repertoireId}/lines`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
  return handle(res);
}

export async function fetchLine(lineId: string): Promise<LineDetail> {
  const res = await fetch(`${API_URL}/api/openings/lines/${lineId}`);
  return handle(res);
}

export async function deleteLine(lineId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/openings/lines/${lineId}`, {
    method: "DELETE",
  });
  await handle(res);
}

export async function saveLineMoves(
  lineId: string,
  moves: string[],
): Promise<LineDetail> {
  const res = await fetch(`${API_URL}/api/openings/lines/${lineId}/moves`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moves: moves.map((san) => ({ san })) }),
  });
  return handle(res);
}

export async function setKeyPosition(
  lineId: string,
  plyIndex: number,
  isKey: boolean,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/openings/lines/${lineId}/plies/${plyIndex}/key`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_key: isKey }),
    },
  );
  await handle(res);
}

export async function generateExplanations(
  lineId: string,
): Promise<LineDetail> {
  const res = await fetch(
    `${API_URL}/api/openings/lines/${lineId}/generate-explanations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  return handle(res);
}

export async function recordPractice(lineId: string): Promise<void> {
  await fetch(`${API_URL}/api/openings/lines/${lineId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record_practice: true }),
  });
}

export function explanationForPly(
  line: LineDetail,
  plyIndex: number,
): Explanation | null {
  return line.explanations.find((e) => e.ply_index === plyIndex) ?? null;
}

export function movesFromLine(line: LineDetail): string[] {
  return line.plies.map((p) => p.san);
}

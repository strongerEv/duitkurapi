import type { DateRange } from '../date';

/** Rentang waktu hasil penafsiran pertanyaan, beserta pembandingnya. */
export interface ParsedPeriod {
  label: string;
  range: DateRange;
  /** Periode sebelumnya yang setara, dipakai untuk perbandingan otomatis. */
  previous?: { label: string; range: DateRange };
  /** True bila pengguna tidak menyebut periode sama sekali. */
  implicit: boolean;
}

export type Intent =
  | 'greeting'
  | 'help'
  | 'advice'
  | 'compare'
  | 'ranking'
  | 'debt'
  | 'budget'
  | 'balance'
  | 'metric'
  | 'overview'
  | 'unknown';

export interface ParsedQuestion {
  intent: Intent;
  /** Teks asli setelah dinormalisasi. */
  normalized: string;
  period: ParsedPeriod;
  /** Id kategori yang cocok dengan pertanyaan, bila ada. */
  categoryId?: string;
  categoryName?: string;
  /** 'expense' bila pengguna menanyakan pengeluaran, 'income' untuk pemasukan. */
  flow: 'expense' | 'income';
  /** True bila pengguna secara eksplisit menyebut jenis arus kasnya. */
  flowExplicit: boolean;
  /** Nama orang pada pertanyaan seputar hutang. */
  personName?: string;
}

/* ------------------------------------------------------------------ */
/* Bentuk jawaban                                                      */
/* ------------------------------------------------------------------ */

export interface StatBlock {
  kind: 'stat';
  label: string;
  value: string;
  sub?: string;
  tone?: 'in' | 'out' | 'neutral';
}

export interface BarsBlock {
  kind: 'bars';
  items: { label: string; display: string; pct: number; color: string; icon?: string }[];
}

export interface DeltaBlock {
  kind: 'delta';
  label: string;
  fromLabel: string;
  fromValue: string;
  toLabel: string;
  toValue: string;
  deltaText: string;
  /** True bila perubahannya menguntungkan pengguna. */
  good: boolean;
  flat: boolean;
}

export interface ListBlock {
  kind: 'list';
  items: { icon?: string; title: string; sub?: string; right?: string; tone?: 'in' | 'out' | 'warn' | 'neutral' }[];
}

export interface NoteBlock {
  kind: 'note';
  tone: 'ok' | 'warn' | 'danger';
  title: string;
  text: string;
}

export type AnswerBlock = StatBlock | BarsBlock | DeltaBlock | ListBlock | NoteBlock;

export interface Answer {
  /** Kalimat utama, ditulis seperti manusia menjawab. */
  text: string;
  blocks: AnswerBlock[];
  /** Pertanyaan lanjutan yang relevan. */
  suggestions: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  blocks?: AnswerBlock[];
  suggestions?: string[];
  at: number;
}

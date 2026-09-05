import type { AppData } from '../../types';
import { parseQuestion } from './parse';
import { buildAnswer, CONTOH_PERTANYAAN } from './answer';
import type { Answer } from './types';

export type { Answer, AnswerBlock, ChatMessage } from './types';
export { CONTOH_PERTANYAAN };

/**
 * Menjawab satu pertanyaan tentang keuangan pengguna.
 *
 * Seluruh proses berjalan di perangkat: pertanyaan ditafsirkan dengan kata
 * kunci, lalu angkanya dihitung langsung dari catatan yang tersimpan. Tidak ada
 * data yang dikirim ke mana pun, dan jawabannya tidak mungkin mengarang angka.
 */
export function ask(question: string, data: AppData): Answer {
  const parsed = parseQuestion(question, data);
  return buildAnswer(parsed, data);
}

/** Sapaan pembuka saat panel percakapan pertama kali dibuka. */
export function greeting(data: AppData): Answer {
  const nama = data.settings.userName || 'Sobat';
  const kosong = data.transactions.length === 0;
  if (kosong) {
    return {
      text: `Halo ${nama}! Saya asisten keuanganmu. Begitu ada transaksi tercatat, saya bisa langsung menganalisisnya untukmu.`,
      blocks: [],
      suggestions: ['Kamu bisa bantu apa saja?'],
    };
  }
  return ask('kamu bisa apa saja', data);
}

// Curated, authentic Qur'anic verses — all knowledge/learning themed, which
// fits a teacher's dashboard. Arabic text and references are from the Qur'an;
// translations follow the widely used Saheeh International rendering.
// A verse is picked deterministically by day so it's stable within a day.

export type Ayah = {
  arabic: string;
  translation: string;
  reference: string; // Surah name + ayah number(s)
};

export const AYAHS: Ayah[] = [
  {
    arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
    translation: 'And say, "My Lord, increase me in knowledge."',
    reference: 'Surah Ta-Ha 20:114',
  },
  {
    arabic: 'يَرْفَعِ ٱللَّهُ ٱلَّذِينَ ءَامَنُوا۟ مِنكُمْ وَٱلَّذِينَ أُوتُوا۟ ٱلْعِلْمَ دَرَجَـٰتٍ',
    translation:
      'Allah will raise those who have believed among you and those who were given knowledge, by degrees.',
    reference: 'Surah Al-Mujadila 58:11',
  },
  {
    arabic: 'قُلْ هَلْ يَسْتَوِى ٱلَّذِينَ يَعْلَمُونَ وَٱلَّذِينَ لَا يَعْلَمُونَ',
    translation: 'Say, "Are those who know equal to those who do not know?"',
    reference: 'Surah Az-Zumar 39:9',
  },
  {
    arabic: 'ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ',
    translation: 'Read in the name of your Lord who created.',
    reference: 'Surah Al-‘Alaq 96:1',
  },
  {
    arabic: 'ٱلرَّحْمَـٰنُ • عَلَّمَ ٱلْقُرْءَانَ',
    translation: 'The Most Merciful — Taught the Qur’an.',
    reference: 'Surah Ar-Rahman 55:1–2',
  },
  {
    arabic: 'إِنَّمَا يَخْشَى ٱللَّهَ مِنْ عِبَادِهِ ٱلْعُلَمَـٰٓؤُا۟',
    translation: 'Only those fear Allah, among His servants, who have knowledge.',
    reference: 'Surah Fatir 35:28',
  },
  {
    arabic: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
    translation: 'For indeed, with hardship [will be] ease.',
    reference: 'Surah Ash-Sharh 94:5',
  },
  {
    arabic: 'لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
    translation: 'Allah does not charge a soul except [with that within] its capacity.',
    reference: 'Surah Al-Baqarah 2:286',
  },
];

/** Deterministic day-of-year index so the verse is stable for the whole day. */
export function ayahOfTheDay(date = new Date()): Ayah {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return AYAHS[dayOfYear % AYAHS.length]!;
}

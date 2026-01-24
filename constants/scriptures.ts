export interface Scripture {
  id: string;
  verse: string;
  verseZomi: string;
  verseEnglish: string;
  reference: string;
  category: string;
}

export const SCRIPTURES: Scripture[] = [
  {
    id: '1',
    verse: 'God is love; there is no fear in His love.',
    verseZomi: 'Pasian pen itna a hihi; a itna sung ah gimna om kei hi.',
    verseEnglish: 'God is love; there is no fear in His love.',
    reference: '1 John 4:18',
    category: 'love',
  },
  {
    id: '2',
    verse: 'The Lord is my salvation; whom shall I fear?',
    verseZomi: 'Topa ka Honkhiatpa hi; kua mah ka lau ding hiam?',
    verseEnglish: 'The Lord is my salvation; whom shall I fear?',
    reference: 'Psalm 27:1',
    category: 'faith',
  },
  {
    id: '3',
    verse: 'For God so loved the world that He gave His only Son.',
    verseZomi: 'Pasian in leitung a it mahmah ahih manin a Tapa khatbek pe hi.',
    verseEnglish: 'For God so loved the world that He gave His only Son.',
    reference: 'John 3:16',
    category: 'love',
  },
  {
    id: '4',
    verse: 'The Lord is my light and my salvation.',
    verseZomi: 'Topa ka honkhiatna le ka hatna hi.',
    verseEnglish: 'The Lord is my light and my salvation.',
    reference: 'Psalm 27:1',
    category: 'strength',
  },
  {
    id: '5',
    verse: 'With God, nothing is impossible.',
    verseZomi: 'Pasian tawh khat in bangmah zo kei ding om lo hi.',
    verseEnglish: 'With God, nothing is impossible.',
    reference: 'Luke 1:37',
    category: 'faith',
  },
  {
    id: '6',
    verse: 'Love one another as I have loved you.',
    verseZomi: 'Nang hong ngai in, ken zong kong ngai ding hi.',
    verseEnglish: 'Love one another as I have loved you.',
    reference: 'John 15:12',
    category: 'love',
  },
  {
    id: '7',
    verse: 'The Lord is with you; do not be afraid.',
    verseZomi: 'Topa in nang tawh om hi; lau heak in.',
    verseEnglish: 'The Lord is with you; do not be afraid.',
    reference: 'Joshua 1:9',
    category: 'courage',
  },
  {
    id: '8',
    verse: 'I am the way, the truth, and the life.',
    verseZomi: 'Kei ka lampi, ka thuman le ka nuntak hi.',
    verseEnglish: 'I am the way, the truth, and the life.',
    reference: 'John 14:6',
    category: 'faith',
  },
  {
    id: '9',
    verse: 'I know the plans I have for you, declares the Lord.',
    verseZomi: 'Nangmah ading ngaihsutna ka nei hi, Topa in ci hi.',
    verseEnglish: 'I know the plans I have for you, declares the Lord.',
    reference: 'Jeremiah 29:11',
    category: 'hope',
  },
  {
    id: '10',
    verse: 'The Lord is good; His love endures forever.',
    verseZomi: 'Topa hoih hi; a itna tawntung ding hi.',
    verseEnglish: 'The Lord is good; His love endures forever.',
    reference: 'Psalm 100:5',
    category: 'praise',
  },
  {
    id: '11',
    verse: 'I can do all things through Him who strengthens me.',
    verseZomi: 'Kei sung ah hatna nei in, bangmah zo thei ding hi.',
    verseEnglish: 'I can do all things through Him who strengthens me.',
    reference: 'Philippians 4:13',
    category: 'strength',
  },
  {
    id: '12',
    verse: 'God is my refuge; I will not be afraid.',
    verseZomi: 'Pasian pen ka kivualna hi; bangmah ka lau kei ding hi.',
    verseEnglish: 'God is my refuge; I will not be afraid.',
    reference: 'Psalm 46:1',
    category: 'courage',
  },
];

export function getRandomScripture(): Scripture {
  const index = Math.floor(Math.random() * SCRIPTURES.length);
  return SCRIPTURES[index];
}

export function getScriptureOfTheDay(): Scripture {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const index = dayOfYear % SCRIPTURES.length;
  return SCRIPTURES[index];
}

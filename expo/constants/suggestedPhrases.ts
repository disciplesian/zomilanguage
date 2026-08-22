export interface SuggestedPhrase {
  id: string;
  zomi: string;
  english: string;
  pronunciation: string;
  category: 'greetings' | 'polite' | 'conversation';
}

/**
 * Frequently used Zomi (Tedim CTD) greetings and expressions shown on the home
 * screen to help new learners. Tapping a phrase inserts it into the translator.
 * Wording follows the app's own lesson content for consistency.
 */
export const SUGGESTED_PHRASES: SuggestedPhrase[] = [
  { id: 'sp1', zomi: 'Zingtai hoi', english: 'Good morning', pronunciation: 'Zeeng-tai hoy', category: 'greetings' },
  { id: 'sp2', zomi: 'Nitak hoi', english: 'Good evening', pronunciation: 'Nee-tak hoy', category: 'greetings' },
  { id: 'sp3', zomi: 'An kidah?', english: 'How are you?', pronunciation: 'An kee-dah', category: 'greetings' },
  { id: 'sp4', zomi: 'Ka dam e', english: 'I am fine', pronunciation: 'Kah dahm eh', category: 'conversation' },
  { id: 'sp5', zomi: 'Lungdam mahmah', english: 'Thank you very much', pronunciation: 'Loong-dahm mah-mah', category: 'polite' },
  { id: 'sp6', zomi: 'Lungdam', english: 'Thank you', pronunciation: 'Loong-dahm', category: 'polite' },
  { id: 'sp7', zomi: 'Hong kik gen ve aw', english: 'Please say that again', pronunciation: 'Hong keek gen veh aw', category: 'conversation' },
  { id: 'sp8', zomi: 'Ka dam kei uh', english: "I don't understand", pronunciation: 'Kah dahm kay oo', category: 'conversation' },
  { id: 'sp9', zomi: 'An pai thu aw', english: 'Nice to meet you', pronunciation: 'An pie thoo aw', category: 'polite' },
  { id: 'sp10', zomi: 'Kan mu khawm suah aw', english: 'See you again', pronunciation: 'Kahn moo kahwm soo-ah aw', category: 'greetings' },
];

export interface Translation {
  zomi: string;
  english: string;
  category: string;
}

export interface Phrase {
  id: string;
  zomi: string;
  english: string;
  category: string;
  pronunciation?: string;
  isFavorite?: boolean;
}

export interface LearningLesson {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  xp: number;
  completed: boolean;
  locked: boolean;
  category: string;
}

export interface QuizQuestion {
  id: string;
  type: 'translate' | 'listen' | 'match' | 'fill';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface ForumPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  content: string;
  category: 'question' | 'discussion' | 'contribution' | 'feedback';
  likes: number;
  replies: number;
  createdAt: string;
  isVerified?: boolean;
}

export interface ContributedWord {
  id: string;
  zomi: string;
  english: string;
  pronunciation?: string;
  example?: string;
  contributorName: string;
  contributorId: string;
  status: 'pending' | 'approved' | 'rejected';
  votes: number;
  createdAt: string;
}

export interface WordOfTheDay {
  id: string;
  zomi: string;
  english: string;
  pronunciation?: string;
  partOfSpeech?: string;
  example?: string;
  culturalNote?: string;
  date: string;
}



export const PHRASE_CATEGORIES = [
  { id: 'greetings', name: 'Greetings', icon: 'hand-metal' },
  { id: 'food', name: 'Food & Dining', icon: 'utensils' },
  { id: 'travel', name: 'Travel', icon: 'plane' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag' },
  { id: 'business', name: 'Business', icon: 'briefcase' },
  { id: 'emergency', name: 'Emergency', icon: 'alert-triangle' },
  { id: 'family', name: 'Family', icon: 'users' },
  { id: 'numbers', name: 'Numbers', icon: 'hash' },
];

export const PHRASES: Phrase[] = [
  { id: '1', zomi: 'An kidah?', english: 'How are you?', category: 'greetings', pronunciation: 'An kee-dah' },
  { id: '2', zomi: 'Lungdam mahmah ing', english: 'Thank you very much', category: 'greetings', pronunciation: 'Loong-dam mah-mah eeng' },
  { id: '3', zomi: 'An min kua na ze?', english: "What's your name?", category: 'greetings', pronunciation: 'An meen koo-ah na zeh' },
  { id: '4', zomi: 'An pai thu aw', english: 'Nice to meet you', category: 'greetings', pronunciation: 'An pai thoo aw' },
  { id: '5', zomi: 'Zingtai hoi', english: 'Good morning', category: 'greetings', pronunciation: 'Zeeng-tai hoy' },
  { id: '6', zomi: 'Nitak hoi', english: 'Good evening', category: 'greetings', pronunciation: 'Nee-tak hoy' },
  { id: '7', zomi: 'An ne ding?', english: 'Will you eat?', category: 'food', pronunciation: 'An neh deeng' },
  { id: '8', zomi: 'Tui ka dot', english: 'I want water', category: 'food', pronunciation: 'Too-ee ka dot' },
  { id: '9', zomi: 'Ann a dam ve?', english: 'Is the food good?', category: 'food', pronunciation: 'Ann ah dam veh' },
  { id: '10', zomi: 'Ka gil a khuang', english: 'I am hungry', category: 'food', pronunciation: 'Ka geel ah khoo-ang' },
  { id: '11', zomi: 'An zuang?', english: 'Where are you going?', category: 'travel', pronunciation: 'An zoo-ang' },
  { id: '12', zomi: 'Hotel koi ah om?', english: 'Where is the hotel?', category: 'travel', pronunciation: 'Ho-tel koy ah om' },
  { id: '13', zomi: 'Lam koi ah ze?', english: 'Which way?', category: 'travel', pronunciation: 'Lam koy ah zeh' },
  { id: '14', zomi: 'Ka zin ding', english: 'I will travel', category: 'travel', pronunciation: 'Ka zeen deeng' },
  { id: '15', zomi: 'A man bang ze?', english: 'How much is this?', category: 'shopping', pronunciation: 'Ah man bang zeh' },
  { id: '16', zomi: 'Ka lei ding', english: 'I want to buy', category: 'shopping', pronunciation: 'Ka lay deeng' },
  { id: '17', zomi: 'A sang lua', english: 'It is too expensive', category: 'shopping', pronunciation: 'Ah sang loo-ah' },
  { id: '18', zomi: 'Khop zo hi', english: 'That is enough', category: 'shopping', pronunciation: 'Khop zo hee' },
  { id: '19', zomi: 'Kam ka nei', english: 'I have work', category: 'business', pronunciation: 'Kam ka nay' },
  { id: '20', zomi: 'Tuni ka sem ding', english: 'I will work today', category: 'business', pronunciation: 'Too-nee ka sem deeng' },
  { id: '21', zomi: 'Huih ve aw', english: 'Help me please', category: 'emergency', pronunciation: 'Hoo-ih veh aw' },
  { id: '22', zomi: 'Ka dam kei', english: 'I am not well', category: 'emergency', pronunciation: 'Ka dam kay' },
  { id: '23', zomi: 'Doctor koi ah om?', english: 'Where is the doctor?', category: 'emergency', pronunciation: 'Doc-tor koy ah om' },
  { id: '24', zomi: 'Ka lau', english: 'I am afraid', category: 'emergency', pronunciation: 'Ka lao' },
  { id: '25', zomi: 'Ka pa', english: 'My father', category: 'family', pronunciation: 'Ka pa' },
  { id: '26', zomi: 'Ka nu', english: 'My mother', category: 'family', pronunciation: 'Ka noo' },
  { id: '27', zomi: 'Ka nau', english: 'My sibling', category: 'family', pronunciation: 'Ka now' },
  { id: '28', zomi: 'Ka zi', english: 'My wife', category: 'family', pronunciation: 'Ka zee' },
  { id: '29', zomi: 'Ka ta', english: 'My child', category: 'family', pronunciation: 'Ka ta' },
  { id: '30', zomi: 'Ka innkuan', english: 'My family', category: 'family', pronunciation: 'Ka inn-koo-an' },
  { id: '31', zomi: 'Khat', english: 'One', category: 'numbers', pronunciation: 'Khat' },
  { id: '32', zomi: 'Ni', english: 'Two', category: 'numbers', pronunciation: 'Nee' },
  { id: '33', zomi: 'Thum', english: 'Three', category: 'numbers', pronunciation: 'Thoom' },
  { id: '34', zomi: 'Li', english: 'Four', category: 'numbers', pronunciation: 'Lee' },
  { id: '35', zomi: 'Nga', english: 'Five', category: 'numbers', pronunciation: 'Ngah' },
  { id: '36', zomi: 'Guk', english: 'Six', category: 'numbers', pronunciation: 'Gook' },
  { id: '37', zomi: 'Sagih', english: 'Seven', category: 'numbers', pronunciation: 'Sa-gih' },
  { id: '38', zomi: 'Giat', english: 'Eight', category: 'numbers', pronunciation: 'Gee-at' },
  { id: '39', zomi: 'Kuo', english: 'Nine', category: 'numbers', pronunciation: 'Koo-oh' },
  { id: '40', zomi: 'Sawm', english: 'Ten', category: 'numbers', pronunciation: 'Sawm' },
  { id: '41', zomi: 'Sawm le khat', english: 'Eleven', category: 'numbers', pronunciation: 'Sawm leh khat' },
  { id: '42', zomi: 'Sawm le ni', english: 'Twelve', category: 'numbers', pronunciation: 'Sawm leh nee' },
  { id: '43', zomi: 'Sawm le thum', english: 'Thirteen', category: 'numbers', pronunciation: 'Sawm leh thoom' },
  { id: '44', zomi: 'Sawm le li', english: 'Fourteen', category: 'numbers', pronunciation: 'Sawm leh lee' },
  { id: '45', zomi: 'Sawm le nga', english: 'Fifteen', category: 'numbers', pronunciation: 'Sawm leh ngah' },
  { id: '46', zomi: 'Sawm le guk', english: 'Sixteen', category: 'numbers', pronunciation: 'Sawm leh gook' },
  { id: '47', zomi: 'Sawm le sagih', english: 'Seventeen', category: 'numbers', pronunciation: 'Sawm leh sa-gih' },
  { id: '48', zomi: 'Sawm le giat', english: 'Eighteen', category: 'numbers', pronunciation: 'Sawm leh gee-at' },
  { id: '49', zomi: 'Sawm le kuo', english: 'Nineteen', category: 'numbers', pronunciation: 'Sawm leh koo-oh' },
  { id: '50', zomi: 'Sawmni', english: 'Twenty', category: 'numbers', pronunciation: 'Sawm-nee' },
];

export const SUGGESTIONS = ['Cidamna', 'Lametna', 'Peemtate', 'Galtai', 'Sungpai', 'Ka it', 'Dam ve', 'Pai ve'];

export const ENGLISH_SUGGESTIONS = [
  'Hello', 
  'How are you?', 
  'Thank you', 
  'Good morning', 
  'I love you', 
  'Where are you going?', 
  'What is your name?',
  'I am hungry'
];

export const LEARNING_LESSONS: LearningLesson[] = [
  {
    id: '1',
    title: 'Basic Greetings',
    description: 'Learn essential Zomi greetings and introductions',
    difficulty: 'beginner',
    duration: 5,
    xp: 50,
    completed: true,
    locked: false,
    category: 'basics',
  },
  {
    id: '2',
    title: 'Common Phrases',
    description: 'Master everyday conversational phrases',
    difficulty: 'beginner',
    duration: 8,
    xp: 75,
    completed: false,
    locked: false,
    category: 'basics',
  },
  {
    id: '3',
    title: 'Numbers 1-20',
    description: 'Count and use numbers in Zomi',
    difficulty: 'beginner',
    duration: 10,
    xp: 100,
    completed: false,
    locked: false,
    category: 'numbers',
  },
  {
    id: '4',
    title: 'Family Members',
    description: 'Learn vocabulary for family relationships',
    difficulty: 'beginner',
    duration: 7,
    xp: 80,
    completed: false,
    locked: true,
    category: 'vocabulary',
  },
  {
    id: '5',
    title: 'Food & Dining',
    description: 'Discuss food, eating, and restaurants',
    difficulty: 'intermediate',
    duration: 12,
    xp: 120,
    completed: false,
    locked: true,
    category: 'vocabulary',
  },
  {
    id: '6',
    title: 'Verb Conjugation',
    description: 'Understanding Zomi verb patterns',
    difficulty: 'intermediate',
    duration: 15,
    xp: 150,
    completed: false,
    locked: true,
    category: 'grammar',
  },
];

export const LEARNING_ACHIEVEMENTS = [
  { id: '1', title: 'First Translation', description: 'Completed your first translation', icon: 'star', unlocked: true, color: 'yellow' },
  { id: '2', title: 'Beginner Level', description: 'Reached Beginner proficiency', icon: 'graduation-cap', unlocked: true, color: 'cyan' },
  { id: '3', title: 'Vocabulary Builder', description: 'Learn 50 Zomi words', icon: 'book-open', unlocked: false, color: 'green' },
  { id: '4', title: 'Streak Master', description: 'Maintain 7-day streak', icon: 'flame', unlocked: false, color: 'pink' },
  { id: '5', title: 'Quiz Champion', description: 'Score 100% on 5 quizzes', icon: 'trophy', unlocked: false, color: 'purple' },
  { id: '6', title: 'Conversation Pro', description: 'Complete 10 dialogues', icon: 'message-circle', unlocked: false, color: 'cyan' },
];

export interface GrammarExample {
  tense: string;
  zomi: string;
  english: string;
}

export interface GrammarTip {
  id: string;
  title: string;
  description: string;
  examples: GrammarExample[];
}

export const GRAMMAR_TIPS: GrammarTip[] = [
  {
    id: '1',
    title: 'Verb Conjugation',
    description: 'Unlike English, Zomi verbs don\'t change form based on the subject. Instead, particles are added to indicate tense and aspect.',
    examples: [
      { tense: 'Present', zomi: 'pai', english: 'go' },
      { tense: 'Past', zomi: 'pai zo', english: 'went' },
      { tense: 'Future', zomi: 'pai ding', english: 'will go' },
      { tense: 'Progressive', zomi: 'pai lai', english: 'going' },
    ],
  },
  {
    id: '2',
    title: 'Word Order',
    description: 'Zomi typically follows Subject-Object-Verb (SOV) word order, unlike English which uses SVO.',
    examples: [
      { tense: 'SOV Example', zomi: 'Ka tui dot', english: 'I water drink (I drink water)' },
      { tense: 'Another', zomi: 'An ann ne', english: 'You food eat (You eat food)' },
    ],
  },
];

export const DAILY_WORDS = [
  { zomi: 'Ni', english: 'Sun/Day', pronunciation: 'Nee' },
  { zomi: 'Khua', english: 'Village/Place', pronunciation: 'Koo-ah' },
  { zomi: 'Suang', english: 'Stone/Rock', pronunciation: 'Soo-ang' },
  { zomi: 'Lei', english: 'Earth/Ground', pronunciation: 'Lay' },
  { zomi: 'Van', english: 'Sky', pronunciation: 'Van' },
  { zomi: 'Tui', english: 'Water', pronunciation: 'Too-ee' },
  { zomi: 'Mei', english: 'Fire', pronunciation: 'May' },
  { zomi: 'Huih', english: 'Wind', pronunciation: 'Hoo-ih' },
];

export const DAILY_ENGLISH_WORDS = [
  { english: 'Friend', zomi: 'Lawm', pronunciation: 'Frend' },
  { english: 'Family', zomi: 'Innkuan', pronunciation: 'Fam-i-lee' },
  { english: 'Happy', zomi: 'Lungdam', pronunciation: 'Hap-ee' },
  { english: 'Work', zomi: 'Nasep', pronunciation: 'Wurk' },
  { english: 'Learn', zomi: 'Zil', pronunciation: 'Lurn' },
  { english: 'Beautiful', zomi: 'Hoih', pronunciation: 'Byoo-ti-ful' },
  { english: 'Strong', zomi: 'Hat', pronunciation: 'Strong' },
  { english: 'Eat', zomi: 'Ne', pronunciation: 'Eat' },
];

export const FORUM_POSTS: ForumPost[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'LangTeacher',
    userAvatar: 'LT',
    title: 'Tips for learning Zomi pronunciation',
    content: 'Here are some helpful tips I\'ve gathered for mastering Zomi tones and pronunciation...',
    category: 'discussion',
    likes: 24,
    replies: 8,
    createdAt: '2025-01-15T10:30:00Z',
    isVerified: true,
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'ZomiLearner',
    userAvatar: 'ZL',
    title: 'Help with verb conjugation',
    content: 'Can someone explain the difference between "pai zo" and "pai ding"?',
    category: 'question',
    likes: 12,
    replies: 5,
    createdAt: '2025-01-14T15:45:00Z',
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'NativeSpeaker',
    userAvatar: 'NS',
    title: 'Adding regional expressions',
    content: 'I\'d like to contribute some phrases from my village that aren\'t in the dictionary yet.',
    category: 'contribution',
    likes: 45,
    replies: 12,
    createdAt: '2025-01-13T08:20:00Z',
    isVerified: true,
  },
  {
    id: '4',
    userId: 'user4',
    userName: 'AppUser123',
    userAvatar: 'AU',
    title: 'Feature request: Audio pronunciation',
    content: 'It would be great to have native speaker audio for each word in the dictionary.',
    category: 'feedback',
    likes: 67,
    replies: 15,
    createdAt: '2025-01-12T19:00:00Z',
  },
];

export const CONTRIBUTED_WORDS: ContributedWord[] = [
  {
    id: 'c1',
    zomi: 'Lungnopna',
    english: 'Happiness',
    pronunciation: 'Loong-nop-na',
    example: 'Ka lungnopna a lian',
    contributorName: 'NativeSpeaker',
    contributorId: 'user3',
    status: 'approved',
    votes: 15,
    createdAt: '2025-01-10T12:00:00Z',
  },
  {
    id: 'c2',
    zomi: 'Thilsiam',
    english: 'Creation, artwork',
    pronunciation: 'Thil-see-am',
    example: 'Hi thilsiam a mawi',
    contributorName: 'ZomiArtist',
    contributorId: 'user5',
    status: 'pending',
    votes: 8,
    createdAt: '2025-01-11T09:30:00Z',
  },
];

export interface LessonContent {
  id: string;
  title: string;
  description: string;
  vocabulary: {
    zomi: string;
    english: string;
    pronunciation: string;
    example?: string;
  }[];
  dialogues?: {
    speaker: string;
    zomi: string;
    english: string;
  }[];
  tips?: string[];
}

export const LESSON_CONTENT: Record<string, LessonContent> = {
  '1': {
    id: '1',
    title: 'Basic Greetings',
    description: 'Learn essential Zomi greetings and introductions',
    vocabulary: [
      { zomi: 'An kidah?', english: 'How are you?', pronunciation: 'An kee-dah', example: 'An kidah? Ka dam e.' },
      { zomi: 'Ka dam e', english: 'I am fine', pronunciation: 'Ka dam eh', example: 'Ka dam e, lungdam.' },
      { zomi: 'Lungdam', english: 'Thank you', pronunciation: 'Loong-dam', example: 'Lungdam mahmah.' },
      { zomi: 'Zingtai hoi', english: 'Good morning', pronunciation: 'Zeeng-tai hoy', example: 'Zingtai hoi, an kidah?' },
      { zomi: 'Nitak hoi', english: 'Good evening', pronunciation: 'Nee-tak hoy', example: 'Nitak hoi, an dam ve?' },
      { zomi: 'An min kua na ze?', english: 'What is your name?', pronunciation: 'An meen koo-ah na zeh', example: 'An min kua na ze? Ka min John hi.' },
      { zomi: 'Ka min ... hi', english: 'My name is ...', pronunciation: 'Ka meen ... hee', example: 'Ka min Mang hi.' },
      { zomi: 'An pai thu aw', english: 'Nice to meet you', pronunciation: 'An pai thoo aw', example: 'An pai thu aw, ka lungdam.' },
      { zomi: 'Pai dam in', english: 'Goodbye (to one leaving)', pronunciation: 'Pai dam een', example: 'Pai dam in, nidang ka hong ki mu kik ding.' },
      { zomi: 'Om dam in', english: 'Goodbye (to one staying)', pronunciation: 'Om dam een', example: 'Om dam in, ka pai lai.' },
    ],
    dialogues: [
      { speaker: 'A', zomi: 'Zingtai hoi! An kidah?', english: 'Good morning! How are you?' },
      { speaker: 'B', zomi: 'Ka dam e, lungdam. An kidah?', english: 'I am fine, thank you. How are you?' },
      { speaker: 'A', zomi: 'Ka dam gige e. An min kua na ze?', english: 'I am very well. What is your name?' },
      { speaker: 'B', zomi: 'Ka min Niang hi. An min kua na ze?', english: 'My name is Niang. What is your name?' },
      { speaker: 'A', zomi: 'Ka min Thang hi. An pai thu aw!', english: 'My name is Thang. Nice to meet you!' },
      { speaker: 'B', zomi: 'Lungdam, an pai thu aw!', english: 'Thank you, nice to meet you too!' },
    ],
    tips: [
      'Always greet elders first as a sign of respect',
      'Use "Pu" for grandfather/elderly man and "Pi" for grandmother/elderly woman',
      '"An" is a respectful way to address someone, similar to "you" in formal English',
      'Zomi greetings often inquire about well-being',
    ],
  },
  '2': {
    id: '2',
    title: 'Common Phrases',
    description: 'Master everyday conversational phrases',
    vocabulary: [
      { zomi: 'A hih bang', english: 'Yes / That is right', pronunciation: 'Ah hee bang', example: 'A hih bang, ka theih e.' },
      { zomi: 'A hi kei', english: 'No / That is not right', pronunciation: 'Ah hee kay', example: 'A hi kei, ka theih kei.' },
      { zomi: 'Ka theih kei', english: 'I don\'t know', pronunciation: 'Ka they kay', example: 'Ka theih kei, dong ve aw.' },
      { zomi: 'Ka thei e', english: 'I know / I understand', pronunciation: 'Ka they eh', example: 'Ka thei e, lungdam.' },
      { zomi: 'Koi ah', english: 'Where', pronunciation: 'Koy ah', example: 'Inn koi ah om?' },
      { zomi: 'Bang ci?', english: 'What? / How?', pronunciation: 'Bang chee', example: 'Hi bang ci na ze?' },
      { zomi: 'Kuama', english: 'Who', pronunciation: 'Koo-ah-ma', example: 'Kuama hi na ze?' },
      { zomi: 'Banghang', english: 'Why', pronunciation: 'Bang-hang', example: 'Banghang na pai?' },
      { zomi: 'Bangzat', english: 'How many / How much', pronunciation: 'Bang-zat', example: 'Bangzat a man?' },
      { zomi: 'Nuamtak', english: 'Please / Slowly', pronunciation: 'Noo-am-tak', example: 'Nuamtak gen ve aw.' },
      { zomi: 'Hong kik gen ve aw', english: 'Please say that again', pronunciation: 'Hong keek gen veh aw', example: 'Ka za kei, hong kik gen ve aw.' },
      { zomi: 'Maw le', english: 'Is that so? / Really?', pronunciation: 'Maw leh', example: 'Maw le, ka um kei.' },
    ],
    dialogues: [
      { speaker: 'A', zomi: 'Hi bang ci na ze?', english: 'What is this?' },
      { speaker: 'B', zomi: 'Hi la hi. An theih ve?', english: 'This is a book. Do you know?' },
      { speaker: 'A', zomi: 'A hih bang, ka theih e. Bangzat a man?', english: 'Yes, I know. How much does it cost?' },
      { speaker: 'B', zomi: 'Kyat thong sawmnga a man.', english: 'It costs 50 kyats.' },
      { speaker: 'A', zomi: 'Maw le? A sang lua!', english: 'Really? That\'s too expensive!' },
      { speaker: 'B', zomi: 'A hi kei, a sang kei. A man pha hi.', english: 'No, it\'s not expensive. It\'s a good price.' },
    ],
    tips: [
      '"Ve aw" at the end of a sentence makes it a polite request',
      '"Kei" is used to negate - add it after the verb',
      'Zomi questions often end with "ve?" or "ze?"',
      'Use "nuamtak" when asking someone to slow down or be gentle',
    ],
  },
  '3': {
    id: '3',
    title: 'Numbers 1-20',
    description: 'Count and use numbers in Zomi',
    vocabulary: [
      { zomi: 'Khat', english: 'One (1)', pronunciation: 'Khat', example: 'Mihing khat' },
      { zomi: 'Ni', english: 'Two (2)', pronunciation: 'Nee', example: 'Ni ve hong pai un' },
      { zomi: 'Thum', english: 'Three (3)', pronunciation: 'Thoom', example: 'Tanu thum ka nei' },
      { zomi: 'Li', english: 'Four (4)', pronunciation: 'Lee', example: 'Inn li' },
      { zomi: 'Nga', english: 'Five (5)', pronunciation: 'Ngah', example: 'Kum nga' },
      { zomi: 'Guk', english: 'Six (6)', pronunciation: 'Gook', example: 'Ni guk' },
      { zomi: 'Sagih', english: 'Seven (7)', pronunciation: 'Sa-gih', example: 'Kawl sagih' },
      { zomi: 'Giat', english: 'Eight (8)', pronunciation: 'Gee-at', example: 'La giat' },
      { zomi: 'Kuo', english: 'Nine (9)', pronunciation: 'Koo-oh', example: 'Khua kuo' },
      { zomi: 'Sawm', english: 'Ten (10)', pronunciation: 'Sawm', example: 'Tangka sawm' },
      { zomi: 'Sawm le khat', english: 'Eleven (11)', pronunciation: 'Sawm leh khat', example: 'Mihing sawm le khat' },
      { zomi: 'Sawm le ni', english: 'Twelve (12)', pronunciation: 'Sawm leh nee', example: 'Thla sawm le ni' },
      { zomi: 'Sawm le thum', english: 'Thirteen (13)', pronunciation: 'Sawm leh thoom', example: 'Kum sawm le thum' },
      { zomi: 'Sawm le li', english: 'Fourteen (14)', pronunciation: 'Sawm leh lee', example: 'Ni sawm le li' },
      { zomi: 'Sawm le nga', english: 'Fifteen (15)', pronunciation: 'Sawm leh ngah', example: 'Kyat sawm le nga' },
      { zomi: 'Sawm le guk', english: 'Sixteen (16)', pronunciation: 'Sawm leh gook', example: 'Mihing sawm le guk' },
      { zomi: 'Sawm le sagih', english: 'Seventeen (17)', pronunciation: 'Sawm leh sa-gih', example: 'Kum sawm le sagih' },
      { zomi: 'Sawm le giat', english: 'Eighteen (18)', pronunciation: 'Sawm leh gee-at', example: 'Ni sawm le giat' },
      { zomi: 'Sawm le kuo', english: 'Nineteen (19)', pronunciation: 'Sawm leh koo-oh', example: 'Inn sawm le kuo' },
      { zomi: 'Sawmni', english: 'Twenty (20)', pronunciation: 'Sawm-nee', example: 'Tangka sawmni' },
    ],
    dialogues: [
      { speaker: 'A', zomi: 'Bangzat a man na ze?', english: 'How much does this cost?' },
      { speaker: 'B', zomi: 'Kyat sawm le nga a man.', english: 'It costs 15 kyats.' },
      { speaker: 'A', zomi: 'Tanu bangzat na nei?', english: 'How many children do you have?' },
      { speaker: 'B', zomi: 'Tanu thum ka nei.', english: 'I have three children.' },
      { speaker: 'A', zomi: 'Kum bangzat na hi?', english: 'How old are you?' },
      { speaker: 'B', zomi: 'Kum sawmni ka hi.', english: 'I am 20 years old.' },
    ],
    tips: [
      'Numbers 11-19 follow the pattern: Sawm (10) + le (and) + unit',
      '"Sawmni" (20) combines Sawm (10) + ni (2)',
      'Numbers are placed before the noun they modify',
      'Use "bangzat" to ask "how many" or "how much"',
      'For counting objects, add classifiers after the number',
    ],
  },
};

export interface QuizItem {
  id: string;
  lessonId: string;
  type: 'multiple_choice' | 'translate' | 'listen' | 'fill_blank';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  audioHint?: string;
}

export const QUIZ_QUESTIONS: QuizItem[] = [
  { id: 'q1', lessonId: '1', type: 'multiple_choice', question: 'How do you say "How are you?" in Zomi?', options: ['Ka dam e', 'An kidah?', 'Lungdam', 'Zingtai hoi'], correctAnswer: 'An kidah?', explanation: '"An kidah?" is the standard way to ask "How are you?" in Zomi.' },
  { id: 'q2', lessonId: '1', type: 'translate', question: 'Translate: "Ka dam e"', options: ['Good morning', 'I am fine', 'Thank you', 'Goodbye'], correctAnswer: 'I am fine', explanation: '"Ka dam e" means "I am fine" - a common response to "An kidah?"' },
  { id: 'q3', lessonId: '1', type: 'multiple_choice', question: 'What does "Lungdam" mean?', options: ['Hello', 'Goodbye', 'Thank you', 'Sorry'], correctAnswer: 'Thank you', explanation: '"Lungdam" literally means "happy heart" and is used to express gratitude.' },
  { id: 'q4', lessonId: '1', type: 'translate', question: 'What is "Good morning" in Zomi?', options: ['Nitak hoi', 'Zingtai hoi', 'An kidah?', 'Pai dam in'], correctAnswer: 'Zingtai hoi', explanation: '"Zingtai" means morning, "hoi" means good.' },
  { id: 'q5', lessonId: '1', type: 'fill_blank', question: 'Ka ___ ... hi (My name is ...)', options: ['dam', 'min', 'pai', 'om'], correctAnswer: 'min', explanation: '"Min" means name. "Ka min ... hi" is the pattern for stating your name.' },
  { id: 'q6', lessonId: '2', type: 'multiple_choice', question: 'How do you say "Yes" in Zomi?', options: ['A hi kei', 'A hih bang', 'Ka theih kei', 'Maw le'], correctAnswer: 'A hih bang', explanation: '"A hih bang" means "Yes" or "That is right."' },
  { id: 'q7', lessonId: '2', type: 'translate', question: 'Translate: "Ka theih kei"', options: ['I know', 'I don\'t know', 'Yes', 'No'], correctAnswer: 'I don\'t know', explanation: '"Kei" negates the verb. "Theih" means to know.' },
  { id: 'q8', lessonId: '2', type: 'multiple_choice', question: 'What does "Koi ah" mean?', options: ['What', 'Who', 'Where', 'Why'], correctAnswer: 'Where', explanation: '"Koi ah" is used to ask "where" in questions.' },
  { id: 'q9', lessonId: '2', type: 'translate', question: 'How do you say "Please say that again"?', options: ['Ka thei e', 'Hong kik gen ve aw', 'Nuamtak', 'Maw le'], correctAnswer: 'Hong kik gen ve aw', explanation: '"Hong kik gen ve aw" politely asks someone to repeat.' },
  { id: 'q10', lessonId: '2', type: 'fill_blank', question: 'Bang___ na pai? (Why are you going?)', options: ['zat', 'hang', 'ci', 'ma'], correctAnswer: 'hang', explanation: '"Banghang" means "why" in Zomi questions.' },
  { id: 'q11', lessonId: '3', type: 'multiple_choice', question: 'What is "Five" in Zomi?', options: ['Li', 'Nga', 'Guk', 'Thum'], correctAnswer: 'Nga', explanation: '"Nga" is the Zomi word for the number 5.' },
  { id: 'q12', lessonId: '3', type: 'translate', question: 'Translate: "Sawm"', options: ['Five', 'Eight', 'Ten', 'Twenty'], correctAnswer: 'Ten', explanation: '"Sawm" means 10 and is the base for numbers 11-19.' },
  { id: 'q13', lessonId: '3', type: 'multiple_choice', question: 'How do you say "Fifteen" in Zomi?', options: ['Sawm le li', 'Sawm le nga', 'Sawm le guk', 'Sawmni'], correctAnswer: 'Sawm le nga', explanation: '15 = Sawm (10) + le (and) + nga (5)' },
  { id: 'q14', lessonId: '3', type: 'translate', question: 'What is "Sawmni" in English?', options: ['Twelve', 'Fifteen', 'Twenty', 'Ten'], correctAnswer: 'Twenty', explanation: '"Sawmni" combines Sawm (10) and ni (2) to make 20.' },
  { id: 'q15', lessonId: '3', type: 'fill_blank', question: 'Sawm le ___ (Nineteen)', options: ['kuo', 'giat', 'sagih', 'guk'], correctAnswer: 'kuo', explanation: '19 = Sawm (10) + le (and) + kuo (9)' },
];

export const LISTENING_EXERCISES: {
  id: string;
  lessonId: string;
  zomiText: string;
  englishText: string;
  options: string[];
  correctAnswer: string;
}[] = [
  { id: 'l1', lessonId: '1', zomiText: 'An kidah?', englishText: 'How are you?', options: ['Ka dam e', 'Lungdam', 'Zingtai hoi', 'An kidah?'], correctAnswer: 'An kidah?' },
  { id: 'l2', lessonId: '1', zomiText: 'Ka dam e', englishText: 'I am fine', options: ['Ka dam e', 'A hih bang', 'Pai dam in', 'Ka min'], correctAnswer: 'Ka dam e' },
  { id: 'l3', lessonId: '1', zomiText: 'Lungdam mahmah', englishText: 'Thank you very much', options: ['An kidah?', 'Lungdam mahmah', 'Zingtai hoi', 'Nitak hoi'], correctAnswer: 'Lungdam mahmah' },
  { id: 'l4', lessonId: '2', zomiText: 'Ka theih kei', englishText: 'I don\'t know', options: ['Ka thei e', 'Ka theih kei', 'A hih bang', 'A hi kei'], correctAnswer: 'Ka theih kei' },
  { id: 'l5', lessonId: '2', zomiText: 'Koi ah om?', englishText: 'Where is it?', options: ['Bang ci?', 'Koi ah om?', 'Kuama?', 'Banghang?'], correctAnswer: 'Koi ah om?' },
  { id: 'l6', lessonId: '3', zomiText: 'Sawm le nga', englishText: 'Fifteen', options: ['Sawm le li', 'Sawm le nga', 'Sawm le guk', 'Sawmni'], correctAnswer: 'Sawm le nga' },
  { id: 'l7', lessonId: '3', zomiText: 'Khat, ni, thum', englishText: 'One, two, three', options: ['Li, nga, guk', 'Khat, ni, thum', 'Sagih, giat, kuo', 'Sawm, sawmni'], correctAnswer: 'Khat, ni, thum' },
];

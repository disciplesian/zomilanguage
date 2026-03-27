export interface User {
  [key: string]: unknown;
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'moderator' | 'admin';
  isPremium: boolean;
  premiumExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
}

export interface TranslationHistory {
  [key: string]: unknown;
  id: string;
  userId: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: 'zomi' | 'english';
  targetLanguage: 'zomi' | 'english';
  translationType: 'text' | 'image' | 'document' | 'audio';
  isFavorite: boolean;
  fileName?: string;
  fileThumbnail?: string;
  createdAt: string;
}

export interface ForumPost {
  [key: string]: unknown;
  id: string;
  userId: string;
  title: string;
  content: string;
  category: 'question' | 'discussion' | 'contribution' | 'feedback';
  likes: number;
  replies: number;
  isLocked: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForumReply {
  [key: string]: unknown;
  id: string;
  postId: string;
  userId: string;
  content: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export interface WordContribution {
  [key: string]: unknown;
  id: string;
  userId: string;
  zomi: string;
  english: string;
  pronunciation?: string;
  example?: string;
  partOfSpeech?: string;
  category?: string;
  dialectSpecific?: string;
  status: 'pending' | 'approved' | 'rejected';
  votes: number;
  moderatorNote?: string;
  moderatorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  [key: string]: unknown;
  id: string;
  userId?: string;
  type: 'bug' | 'feature' | 'translation' | 'general';
  title: string;
  content: string;
  deviceInfo?: string;
  appVersion?: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface ModerationAction {
  [key: string]: unknown;
  id: string;
  moderatorId: string;
  targetType: 'post' | 'reply' | 'word' | 'user';
  targetId: string;
  action: 'delete' | 'hide' | 'approve' | 'reject' | 'warn' | 'ban';
  reason?: string;
  createdAt: string;
}

export interface UploadedFile {
  [key: string]: unknown;
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  relatedTo?: string;
  createdAt: string;
}

export interface UserStats {
  [key: string]: unknown;
  userId: string;
  translationsCount: number;
  contributionsCount: number;
  postsCount: number;
  repliesCount: number;
  points: number;
  updatedAt: string;
}

export interface Donation {
  [key: string]: unknown;
  id: string;
  userId?: string;
  donorName: string;
  donorEmail?: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
  message?: string;
  designation: 'general' | 'dictionary' | 'education' | 'community' | 'development';
  isAnonymous: boolean;
  isDisplayed: boolean;
  paymentMethod: 'stripe' | 'paypal' | 'cash';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentIntentId?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DictionaryEntry {
  [key: string]: unknown;
  id: string;
  english: string;
  englishNormalized: string;
  zomi: string;
  pos?: string;
  explanation?: string;
  usageExample?: string;
  synonyms?: string[];
  antonyms?: string[];
  usageExamples?: string[];
  pronunciation?: string;
  partOfSpeech?: string;
  example?: string;
  category?: string;
  relatedWords?: string[];
  status: 'draft' | 'published' | 'archived';
  sourceType: 'imported' | 'admin' | 'community';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isApproved: boolean;
}

export interface DictionaryVariant {
  [key: string]: unknown;
  id: string;
  entryId: string;
  zomiVariant: string;
  explanationVariant?: string;
  usageExampleVariant?: string;
  sortOrder: number;
}

export interface DictionarySuggestion {
  [key: string]: unknown;
  id: string;
  entryId?: string;
  suggestionType: 'edit_entry' | 'add_entry' | 'add_variant' | 'report_issue';
  proposedChanges: {
    english?: string;
    pos?: string;
    zomi?: string;
    explanation?: string;
    usageExample?: string;
    reportReason?: string;
  };
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  submittedBy: string;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DictionaryImportJob {
  [key: string]: unknown;
  id: string;
  fileName: string;
  fileType: 'csv' | 'xlsx';
  mode: 'add_only' | 'update_only' | 'upsert';
  totalRows: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdBy: string;
  createdAt: string;
}

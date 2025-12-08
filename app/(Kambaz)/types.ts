export interface User {
  _id: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
    dob?: string;
  role: "STUDENT" | "FACULTY" | "ADMIN" | "TA";
  loginId?: string;
  section?: string;
  lastActivity?: string;
  totalActivity?: string;
}

export interface Course {
  _id: string;
  name: string;
  number: string;
  startDate: string;
  endDate: string;
  department: string;
  credits: number;
  description: string;
  author?: string;
  image?: string;
}

export interface Module {
  _id: string;
  name: string;
  description?: string;
  course: string;
  lessons?: Lesson[];
  editing?: boolean;
}

export interface Lesson {
  _id: string;
  name: string;
  description?: string;
  module: string;
}

export interface Assignment {
  _id: string;
  title: string;
  course: string;
  description?: string;
  points?: number;
  group?: string;
  gradeAs?: string;
  submissionType?: string;
  dueDate?: string;
  availableFrom?: string;
  availableUntil?: string;
}

export interface Enrollment {
  _id: string;
  user: string;
  course: string;
}

// Quiz Types
export type QuizType = "graded-quiz" | "practice-quiz" | "graded-survey" | "ungraded-survey";
export type AssignmentGroup = "quizzes" | "exams" | "assignments" | "project";
export type ShowCorrectAnswers = "always" | "after-submission" | "after-due-date" | "never";

export interface Quiz {
  _id: string;
  courseId: string;
  title: string;
  description: string;
  quizType: QuizType;
  points: number;
  assignmentGroup: AssignmentGroup;
  shuffleAnswers: boolean;
  timeLimit: number; // in minutes
  multipleAttempts: boolean;
  attemptsAllowed: number;
  showCorrectAnswers: ShowCorrectAnswers;
  accessCode: string;
  oneQuestionAtATime: boolean;
  webcamRequired: boolean;
  lockQuestionsAfterAnswering: boolean;
  dueDate: string | null;
  availableDate: string | null;
  availableUntilDate: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  score?: number;
  totalPoints?: number;
}

export type QuestionType = "multiple-choice" | "true-false" | "fill-blank";

export interface MultipleChoiceQuestion {
  _id: string;
  quizId: string;
  type: "multiple-choice";
  title: string;
  points: number;
  question: string;
  choices: string[];
  correctChoiceIndex?: number; // For backward compatibility (single answer)
  correctChoiceIndices?: number[]; // For multiple correct answers
  group?: string; // Question group
}

export interface TrueFalseQuestion {
  _id: string;
  quizId: string;
  type: "true-false";
  title: string;
  points: number;
  question: string;
  correctAnswer: boolean;
  group?: string; // Question group
}

export interface FillBlankQuestion {
  _id: string;
  quizId: string;
  type: "fill-blank";
  title: string;
  points: number;
  question: string;
  correctAnswers: string[];
  group?: string; // Question group
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | FillBlankQuestion;

// Answer can be: number (single choice), number[] (multiple choice), boolean (true/false), string (fill-blank), or Record<string, string> (fill-blank with multiple blanks)
export type AnswerValue = number | number[] | boolean | string | Record<string, string>;

export interface QuizAttempt {
  _id: string;
  quizId: string;
  studentId: string;
  answers: Record<string, AnswerValue>; // questionId -> answer
  score: number;
  totalPoints: number;
  submittedAt: string;
  attemptNumber: number;
  gradedAnswers?: Record<string, { answer: AnswerValue; correct: boolean; correctAnswer: AnswerValue }>;
}
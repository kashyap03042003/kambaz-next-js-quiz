import axios from "axios";

const axiosWithCredentials = axios.create({ withCredentials: true });

const HTTP_SERVER = process.env.NEXT_PUBLIC_HTTP_SERVER;
const QUIZZES_API = `${HTTP_SERVER}/api/quizzes`;

export const findQuizzesForCourse = async (courseId: string) => {
  const response = await axiosWithCredentials.get(`${QUIZZES_API}/course/${courseId}`);
  return response.data;
};

export const findQuizById = async (quizId: string) => {
  const response = await axiosWithCredentials.get(`${QUIZZES_API}/${quizId}`);
  return response.data;
};

export const createQuiz = async (courseId: string) => {
  const response = await axiosWithCredentials.post(`${QUIZZES_API}/course/${courseId}`);
  return response.data;
};

export const updateQuiz = async (quiz: any) => {
  const response = await axiosWithCredentials.put(`${QUIZZES_API}/${quiz._id}`, quiz);
  return response.data;
};

export const deleteQuiz = async (quizId: string) => {
  const response = await axiosWithCredentials.delete(`${QUIZZES_API}/${quizId}`);
  return response.data;
};

export const publishQuiz = async (quizId: string, published: boolean) => {
  const response = await axiosWithCredentials.patch(`${QUIZZES_API}/${quizId}/publish`, { published });
  return response.data;
};

export const findQuestionsForQuiz = async (quizId: string) => {
  const response = await axiosWithCredentials.get(`${QUIZZES_API}/${quizId}/questions`);
  return response.data;
};

export const createOrUpdateQuestion = async (quizId: string, question: any) => {
  const response = await axiosWithCredentials.post(`${QUIZZES_API}/${quizId}/questions`, question);
  return response.data;
};

export const deleteQuestion = async (quizId: string, questionId: string) => {
  const response = await axiosWithCredentials.delete(`${QUIZZES_API}/${quizId}/questions/${questionId}`);
  return response.data;
};

export const submitQuizAttempt = async (quizId: string, answers: any, accessCode?: string) => {
  const response = await axiosWithCredentials.post(`${QUIZZES_API}/${quizId}/attempts`, { answers, accessCode });
  return response.data;
};

export const findQuizAttempts = async (quizId: string) => {
  const response = await axiosWithCredentials.get(`${QUIZZES_API}/${quizId}/attempts`);
  return response.data;
};


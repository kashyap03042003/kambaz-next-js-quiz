"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../store";
import * as client from "../../client";
import { Quiz, Question, MultipleChoiceQuestion, TrueFalseQuestion, FillBlankQuestion } from "../../../../../types";
import { Button, Card, Form, Tabs, Tab } from "react-bootstrap";
import RichTextEditor from "../../components/RichTextEditor";
import QuestionEditor from "../../components/QuestionEditor";

export default function QuizEditor() {
  const { cid, qid } = useParams();
  const router = useRouter();
  const { currentUser } = useSelector((state: RootState) => state.accountReducer);
  const [quiz, setQuiz] = useState<Partial<Quiz>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "questions">("details");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (qid) {
      loadQuiz();
      loadQuestions();
    }
  }, [qid]);

  const loadQuiz = async () => {
    try {
      const data = await client.findQuizById(qid as string);
      setQuiz(data);
    } catch (error) {
      console.error("Failed to load quiz", error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const data = await client.findQuestionsForQuiz(qid as string);
      setQuestions(data);
    } catch (error) {
      console.error("Failed to load questions", error);
    }
  };

  const handleSave = async (publish: boolean = false) => {
    if (!quiz) return;
    try {
      const updatedQuiz = { ...quiz, published: publish || quiz.published };
      await client.updateQuiz(updatedQuiz as Quiz);
      if (publish) {
        router.push(`/Courses/${cid}/Quizzes`);
      } else {
        router.push(`/Courses/${cid}/Quizzes/${qid}`);
      }
    } catch (error) {
      console.error("Failed to save quiz", error);
    }
  };

  const handleQuestionSave = async (question: Question) => {
    try {
      await client.createOrUpdateQuestion(qid as string, question);
      setEditingQuestion(null);
      loadQuestions();
      loadQuiz(); // Reload to update points
    } catch (error) {
      console.error("Failed to save question", error);
    }
  };

  const handleQuestionDelete = async (questionId: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await client.deleteQuestion(qid as string, questionId);
      loadQuestions();
      loadQuiz(); // Reload to update points
    } catch (error) {
      console.error("Failed to delete question", error);
    }
  };

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      _id: "",
      quizId: qid as string,
      type: "multiple-choice",
      title: "",
      points: 1,
      question: "",
      choices: ["", ""],
      correctChoiceIndex: 0,
    };
    setEditingQuestion(newQuestion);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (currentUser?.role !== "FACULTY") {
    return <div>Access denied</div>;
  }

  return (
    <div id="wd-quiz-editor" className="p-[20px]">
      <div className="mb-4">
        <Link href={`/Courses/${cid}/Quizzes/${qid}`}>← Back to Quiz</Link>
      </div>

      <h2>Edit Quiz: {quiz.title}</h2>

      <div className="flex mb-4 border-b-2 border-gray-300">
        <Button
          variant={activeTab === "details" ? "primary" : "outline-primary"}
          onClick={() => setActiveTab("details")}
          className={`${activeTab === "details" ? "border-b-2 border-blue-600" : "border-b-2 border-transparent"} rounded-none me-3`}
        >
          Details
        </Button>
        <Button
          variant={activeTab === "questions" ? "primary" : "outline-primary"}
          onClick={() => setActiveTab("questions")}
          className={`${activeTab === "questions" ? "border-b-2 border-blue-600" : "border-b-2 border-transparent"} rounded-none`}
        >
          Questions
        </Button>
      </div>

      {activeTab === "details" ? (
        <Card>
          <Card.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  value={quiz.title || ""}
                  onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <RichTextEditor
                  value={quiz.description || ""}
                  onChange={(value) => setQuiz({ ...quiz, description: value })}
                />
              </Form.Group>
              <div className="form-row">
                <Form.Group className="mb-3">
                  <Form.Label>Quiz Type</Form.Label>
                  <Form.Select
                    value={quiz.quizType || "graded-quiz"}
                    onChange={(e) => setQuiz({ ...quiz, quizType: e.target.value as Quiz["quizType"] })}
                  >
                    <option value="graded-quiz">Graded Quiz</option>
                    <option value="practice-quiz">Practice Quiz</option>
                    <option value="graded-survey">Graded Survey</option>
                    <option value="ungraded-survey">Ungraded Survey</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Points (sum of all questions)</Form.Label>
                  <Form.Control type="number" value={quiz.points || 0} disabled />
                </Form.Group>
              </div>
              <div className="form-row">
                <Form.Group className="mb-3">
                  <Form.Label>Multiple Attempts</Form.Label>
                  <Form.Select
                    value={quiz.multipleAttempts ? "yes" : "no"}
                    onChange={(e) => setQuiz({ ...quiz, multipleAttempts: e.target.value === "yes" })}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </Form.Select>
                </Form.Group>
                {quiz.multipleAttempts && (
                  <Form.Group className="mb-3">
                    <Form.Label>How Many Attempts</Form.Label>
                    <Form.Control
                      type="number"
                      value={quiz.attemptsAllowed || 1}
                      onChange={(e) => setQuiz({ ...quiz, attemptsAllowed: parseInt(e.target.value) || 1 })}
                    />
                  </Form.Group>
                )}
              </div>
              <div className="form-row">
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Shuffle Answers"
                    checked={quiz.shuffleAnswers || false}
                    onChange={(e) => setQuiz({ ...quiz, shuffleAnswers: e.target.checked })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Time Limit"
                    checked={(quiz.timeLimit || 0) > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setQuiz({ ...quiz, timeLimit: quiz.timeLimit || 20 });
                      } else {
                        setQuiz({ ...quiz, timeLimit: 0 });
                      }
                    }}
                  />
                  {(quiz.timeLimit || 0) > 0 && (
                    <Form.Control
                      type="number"
                      value={quiz.timeLimit || 20}
                      onChange={(e) => setQuiz({ ...quiz, timeLimit: parseInt(e.target.value) || 20 })}
                      min="1"
                      className="mt-2"
                    />
                  )}
                </Form.Group>
              </div>
              <Form.Group className="mb-3">
                <Form.Label>Show Correct Answers</Form.Label>
                <Form.Select
                  value={quiz.showCorrectAnswers || "after-submission"}
                  onChange={(e) => setQuiz({ ...quiz, showCorrectAnswers: e.target.value as Quiz["showCorrectAnswers"] })}
                >
                  <option value="always">Always</option>
                  <option value="after-submission">After Submission</option>
                  <option value="after-due-date">After Due Date</option>
                  <option value="never">Never</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Access Code</Form.Label>
                <Form.Control
                  type="text"
                  value={quiz.accessCode || ""}
                  onChange={(e) => setQuiz({ ...quiz, accessCode: e.target.value })}
                  placeholder="Leave blank for no access code"
                />
              </Form.Group>
              <div className="form-row">
                <Form.Group className="mb-3">
                  <Form.Label>Due Date</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={quiz.dueDate ? new Date(quiz.dueDate).toISOString().slice(0, 16) : ""}
                    onChange={(e) =>
                      setQuiz({ ...quiz, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Available Date</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={quiz.availableDate ? new Date(quiz.availableDate).toISOString().slice(0, 16) : ""}
                    onChange={(e) =>
                      setQuiz({ ...quiz, availableDate: e.target.value ? new Date(e.target.value).toISOString() : null })
                    }
                  />
                </Form.Group>
              </div>
              <Form.Group className="mb-3">
                <Form.Label>Available Until</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={quiz.availableUntilDate ? new Date(quiz.availableUntilDate).toISOString().slice(0, 16) : ""}
                  onChange={(e) =>
                    setQuiz({ ...quiz, availableUntilDate: e.target.value ? new Date(e.target.value).toISOString() : null })
                  }
                />
              </Form.Group>
              <div className="flex items-center mt-8">
                <Button variant="primary" onClick={() => handleSave(false)} className="me-4">
                  Save
                </Button>
                <Button variant="success" onClick={() => handleSave(true)} className="me-4">
                  Save and Publish
                </Button>
                <Button variant="secondary" onClick={() => router.push(`/Courses/${cid}/Quizzes`)}>
                  Cancel
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #e9ecef' }}>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>Questions ({questions.length})</h3>
            <Button variant="primary" onClick={handleAddQuestion}>
              + New Question
            </Button>
          </div>
          {editingQuestion && (
            <div className="mb-8">
              <QuestionEditor
                question={editingQuestion}
                onSave={handleQuestionSave}
                onCancel={() => setEditingQuestion(null)}
              />
            </div>
          )}
          {questions.length > 0 && (
            <div className="flex flex-col gap-4">
              {questions.map((question, index) => (
                <Card key={question._id} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                  <Card.Body>
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 className="text-lg text-gray-800" style={{ margin: 0 }}>
                          Question {index + 1}: {question.title || "Untitled"}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Button variant="secondary" size="sm" onClick={() => setEditingQuestion(question)}>
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleQuestionDelete(question._id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span>
                          <strong>Type:</strong>{" "}
                          {question.type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        {" • "}
                        <span>
                          <strong>Points:</strong> {question.points}
                        </span>
                      </div>
                    </div>
                    <div className="mb-4 leading-relaxed">
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: question.type === "fill-blank" 
                            ? question.question
                                .replace(/\[___\]/g, '<span class="border-b-2 border-gray-800 px-1 min-w-[60px] inline-block">[___]</span>')
                                .replace(/___/g, '<span class="border-b-2 border-gray-800 px-1 min-w-[60px] inline-block">___</span>')
                            : question.question 
                        }} 
                      />
                    </div>
                    {question.type === "multiple-choice" && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <strong>Choices:</strong>
                        <div style={{ marginTop: '0.5rem' }}>
                          {(question as MultipleChoiceQuestion).choices.map((choice: string, i: number) => {
                            const mcq = question as MultipleChoiceQuestion;
                            const correctIndices = mcq.correctChoiceIndices && mcq.correctChoiceIndices.length > 0
                              ? mcq.correctChoiceIndices
                              : (mcq.correctChoiceIndex !== undefined ? [mcq.correctChoiceIndex] : []);
                            const isCorrect = correctIndices.includes(i);
                            return (
                              <div
                                key={i}
                                className={`p-2 mb-1 bg-gray-100 rounded border-l-[3px] ${isCorrect ? "border-l-green-500 bg-green-100" : "border-l-gray-300"}`}
                              >
                                {isCorrect && <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ </span>}
                                {choice}
                                {isCorrect && (
                                  <span className="text-green-600 ml-2">(Correct)</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {question.type === "true-false" && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <strong>Correct Answer:</strong>
                        <div className="mt-2 p-3 bg-gray-100 rounded inline-block">
                          <strong className="text-green-600">
                            {(question as TrueFalseQuestion).correctAnswer ? "True" : "False"}
                          </strong>
                        </div>
                      </div>
                    )}
                    {question.type === "fill-blank" && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <strong>Correct Answers:</strong>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(question as FillBlankQuestion).correctAnswers.map((answer: string, i: number) => (
                            <span
                              key={i}
                              className="px-3 py-2 bg-green-100 rounded text-green-800 border border-green-300"
                            >
                              {answer}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
          {questions.length === 0 && !editingQuestion && (
            <Card className="text-center p-12">
              <Card.Body>
                <p className="text-lg text-gray-600 m-0">
                  No questions yet. Click <strong>&quot;+ New Question&quot;</strong> to add one.
                </p>
              </Card.Body>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

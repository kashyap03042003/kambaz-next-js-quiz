"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../store";
import * as client from "../../client";
import { Quiz, Question, MultipleChoiceQuestion } from "../../../../../types";
import { Button, Card, Form, Tabs, Tab } from "react-bootstrap";
import RichTextEditor from "../../components/RichTextEditor";
import QuestionEditor from "../../components/QuestionEditor";
import "../../components/QuestionEditor.css";

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
    <div id="wd-quiz-editor" style={{ padding: "20px" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href={`/Courses/${cid}/Quizzes/${qid}`}>← Back to Quiz</Link>
      </div>

      <h2>Edit Quiz: {quiz.title}</h2>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", borderBottom: "2px solid #ddd" }}>
        <Button
          variant={activeTab === "details" ? "primary" : "outline-primary"}
          onClick={() => setActiveTab("details")}
          style={{
            borderBottom: activeTab === "details" ? "2px solid #0066cc" : "2px solid transparent",
            borderRadius: 0,
          }}
        >
          Details
        </Button>
        <Button
          variant={activeTab === "questions" ? "primary" : "outline-primary"}
          onClick={() => setActiveTab("questions")}
          style={{
            borderBottom: activeTab === "questions" ? "2px solid #0066cc" : "2px solid transparent",
            borderRadius: 0,
          }}
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
                      style={{ marginTop: "0.5rem" }}
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
              <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                <Button variant="primary" onClick={() => handleSave(false)}>
                  Save
                </Button>
                <Button variant="success" onClick={() => handleSave(true)}>
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
          <div className="questions-header">
            <h3>Questions ({questions.length})</h3>
            <Button variant="primary" onClick={handleAddQuestion}>
              + New Question
            </Button>
          </div>
          {editingQuestion && (
            <div style={{ marginBottom: "2rem" }}>
              <QuestionEditor
                question={editingQuestion}
                onSave={handleQuestionSave}
                onCancel={() => setEditingQuestion(null)}
              />
            </div>
          )}
          {questions.length > 0 && (
            <div className="questions-list">
              {questions.map((question, index) => (
                <Card key={question._id} className="question-card">
                  <Card.Body>
                    <div className="question-card-header">
                      <div className="question-card-title">
                        <h4>
                          Question {index + 1}: {question.title || "Untitled"}
                        </h4>
                        <div className="question-card-meta">
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
                      <div className="question-card-actions">
                        <Button variant="secondary" size="sm" onClick={() => setEditingQuestion(question)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleQuestionDelete(question._id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="question-card-content">
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: question.type === "fill-blank" 
                            ? question.question
                                .replace(/\[___\]/g, '<span style="border-bottom: 2px solid #333; padding: 0 0.25rem; min-width: 60px; display: inline-block;">[___]</span>')
                                .replace(/___/g, '<span style="border-bottom: 2px solid #333; padding: 0 0.25rem; min-width: 60px; display: inline-block;">___</span>')
                            : question.question 
                        }} 
                      />
                    </div>
                    {question.type === "multiple-choice" && (
                      <div className="question-choices">
                        <strong>Choices:</strong>
                        <ul>
                          {(question as any).choices.map((choice: string, i: number) => {
                            const mcq = question as MultipleChoiceQuestion;
                            const correctIndices = mcq.correctChoiceIndices && mcq.correctChoiceIndices.length > 0
                              ? mcq.correctChoiceIndices
                              : (mcq.correctChoiceIndex !== undefined ? [mcq.correctChoiceIndex] : []);
                            const isCorrect = correctIndices.includes(i);
                            return (
                              <li
                                key={i}
                                style={
                                  isCorrect
                                    ? { borderLeftColor: "#28a745", background: "#d4edda" }
                                    : {}
                                }
                              >
                                {isCorrect && <strong>✓ </strong>}
                                {choice}
                                {isCorrect && (
                                  <span style={{ color: "#28a745", marginLeft: "0.5rem" }}>(Correct)</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {question.type === "true-false" && (
                      <div className="question-choices">
                        <strong>Correct Answer:</strong>
                        <div
                          style={{
                            marginTop: "0.5rem",
                            padding: "0.75rem",
                            background: "#f8f9fa",
                            borderRadius: "4px",
                            display: "inline-block",
                          }}
                        >
                          <strong style={{ color: "#28a745" }}>
                            {(question as any).correctAnswer ? "True" : "False"}
                          </strong>
                        </div>
                      </div>
                    )}
                    {question.type === "fill-blank" && (
                      <div className="question-choices">
                        <strong>Correct Answers:</strong>
                        <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                          {(question as any).correctAnswers.map((answer: string, i: number) => (
                            <span
                              key={i}
                              style={{
                                padding: "0.5rem 0.75rem",
                                background: "#d4edda",
                                borderRadius: "4px",
                                color: "#155724",
                                border: "1px solid #c3e6cb",
                              }}
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
            <Card style={{ textAlign: "center", padding: "3rem" }}>
              <Card.Body>
                <p style={{ fontSize: "1.125rem", color: "#6c757d", margin: 0 }}>
                  No questions yet. Click <strong>"+ New Question"</strong> to add one.
                </p>
              </Card.Body>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

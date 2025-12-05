"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../store";
import * as client from "../../client";
import { Quiz, Question, QuizAttempt, MultipleChoiceQuestion } from "../../../../../types";
import { Button, Card, Form, Alert } from "react-bootstrap";

export default function QuizTake() {
  const { cid, qid } = useParams();
  const router = useRouter();
  const { currentUser } = useSelector((state: RootState) => state.accountReducer);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessCode, setAccessCode] = useState("");
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([]);
  const [showPreviousAttempts, setShowPreviousAttempts] = useState(false);

  useEffect(() => {
    if (qid) {
      loadQuiz();
      loadQuestions();
    }
  }, [qid]);

  useEffect(() => {
    if (quiz && qid) {
      checkAttempts();
    }
  }, [quiz, qid]);

  useEffect(() => {
    if (quiz && quiz.timeLimit && !submitted) {
      setTimeRemaining(quiz.timeLimit * 60); // Convert to seconds
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            if (prev === 1) {
              handleSubmit();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [quiz, submitted]);

  const loadQuiz = async () => {
    try {
      const data = await client.findQuizById(qid as string);
      setQuiz(data);
      if (data.accessCode) {
        setShowAccessCode(true);
      }
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

  const checkAttempts = async () => {
    try {
      const data = await client.findQuizAttempts(qid as string);
      setPreviousAttempts(data);

      if (data.length > 0 && quiz) {
        const lastAttempt = data[0];

        const canRetake = quiz.multipleAttempts && lastAttempt.attemptNumber < quiz.attemptsAllowed;

        if (!canRetake) {
          setAttempt(lastAttempt);
          setSubmitted(true);
          setAnswers(lastAttempt.answers);
        } else {
          setAttempt(null);
          setSubmitted(false);
          setAnswers({});
        }
      }
    } catch (error) {
      console.error("Failed to load attempts", error);
    }
  };

  const handleAccessCodeSubmit = async () => {
    if (!quiz) return;
    if (accessCode !== quiz.accessCode) {
      alert("Invalid access code");
      return;
    }
    setShowAccessCode(false);
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    try {
      const data = await client.submitQuizAttempt(qid as string, answers, quiz.accessCode || undefined);
      setAttempt(data);
      setSubmitted(true);
    } catch (error: any) {
      alert(error.response?.data?.message || error.response?.data?.error || "Failed to submit quiz");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isCorrect = (question: Question, answer: any): boolean => {
    if (!attempt?.gradedAnswers) return false;
    const graded = attempt.gradedAnswers[question._id];
    return graded?.correct || false;
  };

  const getCorrectIndices = (question: MultipleChoiceQuestion): number[] => {
    if (question.correctChoiceIndices && question.correctChoiceIndices.length > 0) {
      return question.correctChoiceIndices;
    } else if (question.correctChoiceIndex !== undefined) {
      return [question.correctChoiceIndex];
    }
    return [];
  };

  if (loading || !quiz) {
    return <div>Loading...</div>;
  }

  if (showAccessCode) {
    return (
      <div style={{ padding: "20px", maxWidth: "500px", margin: "5rem auto" }}>
        <Card>
          <Card.Body>
            <h2>Enter Access Code</h2>
            <Form.Group className="mb-3">
              <Form.Control
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Access Code"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAccessCodeSubmit();
                  }
                }}
              />
            </Form.Group>
            <Button variant="primary" onClick={handleAccessCodeSubmit} style={{ width: "100%" }}>
              Continue
            </Button>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div id="wd-quiz-take" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <Link href={`/Courses/${cid}/Quizzes/${qid}`}>← Back to Quiz</Link>
        {timeRemaining !== null && !submitted && (
          <Alert variant="warning" style={{ margin: 0 }}>
            <strong>Time Remaining: {formatTime(timeRemaining)}</strong>
          </Alert>
        )}
      </div>

      <Card style={{ marginBottom: "2rem" }}>
        <Card.Body>
          <h2>{quiz.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: quiz.description || "" }} />
          {previousAttempts.length > 0 && !submitted && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "#f8f9fa", borderRadius: "4px" }}>
              <p style={{ margin: "0 0 0.5rem 0" }}>
                <strong>Previous Attempts:</strong> {previousAttempts.length}
                {quiz.multipleAttempts && ` / ${quiz.attemptsAllowed} allowed`}
              </p>
              {quiz.multipleAttempts && previousAttempts[0].attemptNumber < quiz.attemptsAllowed && (
                <p style={{ margin: 0, color: "#28a745", fontSize: "0.9rem" }}>
                  ✓ You can retake this quiz. Your previous attempts are saved below.
                </p>
              )}
              {!quiz.multipleAttempts && (
                <p style={{ margin: 0, color: "#dc3545", fontSize: "0.9rem" }}>
                  ⚠ Only one attempt allowed. Showing your previous attempt.
                </p>
              )}
              {previousAttempts.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowPreviousAttempts(!showPreviousAttempts);
                    if (!showPreviousAttempts && previousAttempts.length > 0) {
                      setAttempt(previousAttempts[0]);
                      setSubmitted(true);
                      setAnswers(previousAttempts[0].answers);
                    } else {
                      setAttempt(null);
                      setSubmitted(false);
                      setAnswers({});
                    }
                  }}
                  style={{ marginTop: "0.5rem" }}
                >
                  {showPreviousAttempts ? "Hide Previous Attempt" : "View Previous Attempt"}
                </Button>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {questions.map((question, index) => {
        const isQuestionCorrect = isCorrect(question, answers[question._id]);
        return (
          <Card
            key={question._id}
            style={{
              marginBottom: "1rem",
              borderLeft: submitted
                ? isQuestionCorrect
                  ? "4px solid green"
                  : "4px solid red"
                : "none",
            }}
          >
            <Card.Body>
              <h3>
                Question {index + 1} ({question.points} points)
                {submitted && (
                  <span style={{ marginLeft: "1rem", color: isQuestionCorrect ? "green" : "red" }}>
                    {isQuestionCorrect ? "✓ Correct" : "✗ Incorrect"}
                  </span>
                )}
              </h3>
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: question.type === "fill-blank" 
                    ? question.question.replace(/___/g, '<span style="border-bottom: 2px solid #333; padding: 0 0.5rem; min-width: 100px; display: inline-block;">___</span>')
                        .replace(/\[___\]/g, '<span style="border-bottom: 2px solid #333; padding: 0 0.5rem; min-width: 100px; display: inline-block;">[___]</span>')
                    : question.question 
                }} 
              />

              {question.type === "multiple-choice" && (
                <div style={{ marginTop: "1rem" }}>
                  {(question as MultipleChoiceQuestion).choices.map((choice: string, i: number) => {
                    const mcq = question as MultipleChoiceQuestion;
                    const correctIndices = getCorrectIndices(mcq);
                    const isCorrectAnswer = correctIndices.includes(i);
                    const isSelected = Array.isArray(answers[question._id])
                      ? answers[question._id].includes(i)
                      : answers[question._id] === i;

                    return (
                      <Form.Check
                        key={i}
                        type="checkbox"
                        id={`question-${question._id}-choice-${i}`}
                        label={
                          <span>
                            {choice}
                            {submitted && isCorrectAnswer && (
                              <span style={{ color: "green", marginLeft: "0.5rem" }}>(Correct Answer)</span>
                            )}
                          </span>
                        }
                        checked={isSelected}
                        onChange={(e) => {
                          if (submitted) return;
                          const currentAnswers = Array.isArray(answers[question._id])
                            ? answers[question._id]
                            : answers[question._id] !== undefined
                            ? [answers[question._id]]
                            : [];
                          if (e.target.checked) {
                            setAnswers({ ...answers, [question._id]: [...currentAnswers, i] });
                          } else {
                            setAnswers({ ...answers, [question._id]: currentAnswers.filter((a: number) => a !== i) });
                          }
                        }}
                        disabled={submitted}
                        style={{ marginBottom: "0.5rem" }}
                      />
                    );
                  })}
                </div>
              )}

              {question.type === "true-false" && (
                <div style={{ marginTop: "1rem" }}>
                  <Form.Check
                    type="radio"
                    name={`question-${question._id}`}
                    id={`question-${question._id}-true`}
                    label="True"
                    checked={answers[question._id] === true}
                    onChange={() => setAnswers({ ...answers, [question._id]: true })}
                    disabled={submitted}
                    style={{ marginBottom: "0.5rem" }}
                  />
                  {submitted && (question as any).correctAnswer === true && (
                    <span style={{ color: "green", marginLeft: "0.5rem" }}>(Correct Answer)</span>
                  )}
                  <Form.Check
                    type="radio"
                    name={`question-${question._id}`}
                    id={`question-${question._id}-false`}
                    label="False"
                    checked={answers[question._id] === false}
                    onChange={() => setAnswers({ ...answers, [question._id]: false })}
                    disabled={submitted}
                  />
                  {submitted && (question as any).correctAnswer === false && (
                    <span style={{ color: "green", marginLeft: "0.5rem" }}>(Correct Answer)</span>
                  )}
                </div>
              )}

              {question.type === "fill-blank" && (
                <div style={{ marginTop: "1rem" }}>
                  <Form.Label>
                    <strong>Your Answer:</strong>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={answers[question._id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [question._id]: e.target.value })}
                    disabled={submitted}
                    placeholder="Enter your answer here"
                    style={{
                      fontSize: "1rem",
                      padding: "0.75rem",
                      border: submitted
                        ? isQuestionCorrect
                          ? "2px solid #28a745"
                          : "2px solid #dc3545"
                        : "1px solid #ced4da",
                    }}
                  />
                  {submitted && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div
                        style={{
                          padding: "0.75rem",
                          borderRadius: "4px",
                          backgroundColor: isQuestionCorrect ? "#d4edda" : "#f8d7da",
                          border: `1px solid ${isQuestionCorrect ? "#c3e6cb" : "#f5c6cb"}`,
                        }}
                      >
                        <div style={{ marginBottom: "0.5rem" }}>
                          <strong style={{ color: isQuestionCorrect ? "#155724" : "#721c24" }}>
                            {isQuestionCorrect ? "✓ Correct!" : "✗ Incorrect"}
                          </strong>
                        </div>
                        <div style={{ color: "#666", fontSize: "0.9rem" }}>
                          <strong>Your answer:</strong> {answers[question._id] || "(no answer)"}
                        </div>
                        <div style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                          <strong>Correct answer(s):</strong> {(question as any).correctAnswers.join(", ")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        );
      })}

      {!submitted ? (
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <Button variant="primary" onClick={handleSubmit} size="lg">
            Submit Quiz
          </Button>
        </div>
      ) : (
        attempt && (
          <Card style={{ marginTop: "2rem", textAlign: "center", backgroundColor: "#f0f0f0" }}>
            <Card.Body>
              <h2>Quiz Results</h2>
              <p style={{ fontSize: "1.5rem", marginTop: "1rem" }}>
                Score: {attempt.score} / {attempt.totalPoints}
              </p>
              <p style={{ fontSize: "1.2rem", marginTop: "0.5rem" }}>
                Percentage: {((attempt.score / attempt.totalPoints) * 100).toFixed(1)}%
              </p>
              <p style={{ marginTop: "0.5rem", color: "#666" }}>Attempt #{attempt.attemptNumber}</p>
              {quiz.multipleAttempts && attempt.attemptNumber < quiz.attemptsAllowed && (
                <div style={{ marginTop: "1rem" }}>
                  <Button
                    variant="primary"
                    onClick={async () => {
                      setSubmitted(false);
                      setAnswers({});
                      setAttempt(null);
                      setShowPreviousAttempts(false);
                      await checkAttempts();
                    }}
                    style={{ marginRight: "0.5rem" }}
                  >
                    Start New Attempt
                  </Button>
                  <Button variant="secondary" onClick={() => router.push(`/Courses/${cid}/Quizzes`)}>
                    Back to Quizzes
                  </Button>
                </div>
              )}
              {(!quiz.multipleAttempts || (attempt && attempt.attemptNumber >= quiz.attemptsAllowed)) && (
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/Courses/${cid}/Quizzes`)}
                  style={{ marginTop: "1rem" }}
                >
                  Back to Quizzes
                </Button>
              )}
            </Card.Body>
          </Card>
        )
      )}
    </div>
  );
}


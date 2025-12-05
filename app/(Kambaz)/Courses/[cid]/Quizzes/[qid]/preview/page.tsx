"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../store";
import * as client from "../../client";
import { Quiz, Question, MultipleChoiceQuestion } from "../../../../../types";
import { Button, Card, Form } from "react-bootstrap";

export default function QuizPreview() {
  const { cid, qid } = useParams();
  const router = useRouter();
  const { currentUser } = useSelector((state: RootState) => state.accountReducer);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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

  const handleSubmit = () => {
    // Calculate score locally for preview
    let calculatedScore = 0;
    questions.forEach((question) => {
      const answer = answers[question._id];
      if (!answer) return;

      if (question.type === "multiple-choice") {
        const mcq = question as MultipleChoiceQuestion;
        const correctIndices = mcq.correctChoiceIndices && mcq.correctChoiceIndices.length > 0
          ? mcq.correctChoiceIndices
          : (mcq.correctChoiceIndex !== undefined ? [mcq.correctChoiceIndex] : []);
        
        const studentAnswers = Array.isArray(answer) ? answer : [answer];
        const correctSet = new Set(correctIndices);
        const studentSet = new Set(studentAnswers);
        const isCorrect = studentAnswers.length === correctIndices.length &&
          studentAnswers.every((idx: number) => correctSet.has(idx)) &&
          correctIndices.every((idx: number) => studentSet.has(idx));
        
        if (isCorrect) {
          calculatedScore += question.points;
        }
      } else if (question.type === "true-false") {
        const tfq = question as any;
        if (answer === tfq.correctAnswer) {
          calculatedScore += question.points;
        }
      } else if (question.type === "fill-blank") {
        const fbq = question as any;
        const answerStr = String(answer).trim();
        if (fbq.correctAnswers.some((ca: string) => ca.trim() === answerStr)) {
          calculatedScore += question.points;
        }
      }
    });

    setScore(calculatedScore);
    setSubmitted(true);
  };

  const isCorrect = (question: Question, answer: any): boolean => {
    if (question.type === "multiple-choice") {
      const mcq = question as MultipleChoiceQuestion;
      const correctIndices = mcq.correctChoiceIndices && mcq.correctChoiceIndices.length > 0
        ? mcq.correctChoiceIndices
        : (mcq.correctChoiceIndex !== undefined ? [mcq.correctChoiceIndex] : []);
      
      const studentAnswers = Array.isArray(answer) ? answer : [answer];
      const correctSet = new Set(correctIndices);
      const studentSet = new Set(studentAnswers);
      return studentAnswers.length === correctIndices.length &&
        studentAnswers.every((idx: number) => correctSet.has(idx)) &&
        correctIndices.every((idx: number) => studentSet.has(idx));
    } else if (question.type === "true-false") {
      const tfq = question as any;
      return answer === tfq.correctAnswer;
    } else if (question.type === "fill-blank") {
      const fbq = question as any;
      const answerStr = String(answer || "").trim();
      return fbq.correctAnswers.some((ca: string) => ca.trim() === answerStr);
    }
    return false;
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

  if (currentUser?.role !== "FACULTY") {
    return <div>Access denied</div>;
  }

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div id="wd-quiz-preview" style={{ padding: "20px" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href={`/Courses/${cid}/Quizzes/${qid}`}>← Back to Quiz</Link>
      </div>

      <Card style={{ marginBottom: "2rem" }}>
        <Card.Body>
          <h2>Preview: {quiz.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: quiz.description || "" }} />
          <p style={{ marginTop: "1rem", color: "#666" }}>
            This is how students will see the quiz. You can answer questions to test the quiz.
          </p>
        </Card.Body>
      </Card>

      {!submitted ? (
        <>
          {/* Question Navigation */}
          <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>Question {currentQuestionIndex + 1} of {questions.length}</strong>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {questions.map((_, index) => (
                <Button
                  key={index}
                  variant={index === currentQuestionIndex ? "primary" : "outline-primary"}
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(index)}
                  style={{ minWidth: "40px" }}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </div>

          {questions.length > 0 && (() => {
            const question = questions[currentQuestionIndex];
            if (!question) return null;
        const questionCorrect = isCorrect(question, answers[question._id]);
        return (
          <Card
            key={question._id}
            style={{
              marginBottom: "1rem",
              borderLeft: submitted
                ? questionCorrect
                  ? "4px solid green"
                  : "4px solid red"
                : "none",
            }}
          >
            <Card.Body>
              <h3>
                Question {currentQuestionIndex + 1} ({question.points} points)
              </h3>
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: question.type === "fill-blank" 
                    ? question.question.replace(/\[___\]/g, '<span style="border-bottom: 2px solid #333; padding: 0 0.25rem; min-width: 60px; display: inline-block;">[___]</span>')
                        .replace(/___/g, '<span style="border-bottom: 2px solid #333; padding: 0 0.25rem; min-width: 60px; display: inline-block;">___</span>')
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
                        ? questionCorrect
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
                          backgroundColor: questionCorrect ? "#d4edda" : "#f8d7da",
                          border: `1px solid ${questionCorrect ? "#c3e6cb" : "#f5c6cb"}`,
                        }}
                      >
                        <div style={{ marginBottom: "0.5rem" }}>
                          <strong style={{ color: questionCorrect ? "#155724" : "#721c24" }}>
                            {questionCorrect ? "✓ Correct!" : "✗ Incorrect"}
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
          })()}

          {/* Navigation Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
            <Button
              variant="secondary"
              onClick={() => {
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex(currentQuestionIndex - 1);
                }
              }}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <div style={{ display: "flex", gap: "1rem" }}>
              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    if (currentQuestionIndex < questions.length - 1) {
                      setCurrentQuestionIndex(currentQuestionIndex + 1);
                    }
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button variant="success" onClick={handleSubmit} size="lg">
                  Submit Preview
                </Button>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Show all questions after submission for review */}
          {questions.map((question, index) => {
            const questionCorrect = isCorrect(question, answers[question._id]);
            return (
              <Card
                key={question._id}
                style={{
                  marginBottom: "1rem",
                  borderLeft: questionCorrect
                    ? "4px solid green"
                    : "4px solid red",
                }}
              >
                <Card.Body>
                  <h3>
                    Question {index + 1} ({question.points} points)
                    <span style={{ marginLeft: "1rem", color: questionCorrect ? "green" : "red" }}>
                      {questionCorrect ? "✓ Correct" : "✗ Incorrect"}
                    </span>
                  </h3>
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: question.type === "fill-blank" 
                        ? question.question.replace(/\[___\]/g, '<span style="border-bottom: 2px solid #333; padding: 0 0.25rem; min-width: 60px; display: inline-block;">[___]</span>')
                            .replace(/___/g, '<span style="border-bottom: 2px solid #333; padding: 0 0.25rem; min-width: 60px; display: inline-block;">___</span>')
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
                                {isCorrectAnswer && (
                                  <span style={{ color: "green", marginLeft: "0.5rem" }}>(Correct Answer)</span>
                                )}
                              </span>
                            }
                            checked={isSelected}
                            disabled={true}
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
                        disabled={true}
                        style={{ marginBottom: "0.5rem" }}
                      />
                      {(question as any).correctAnswer === true && (
                        <span style={{ color: "green", marginLeft: "0.5rem" }}>(Correct Answer)</span>
                      )}
                      <Form.Check
                        type="radio"
                        name={`question-${question._id}`}
                        id={`question-${question._id}-false`}
                        label="False"
                        checked={answers[question._id] === false}
                        disabled={true}
                      />
                      {(question as any).correctAnswer === false && (
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
                        disabled={true}
                        style={{
                          fontSize: "1rem",
                          padding: "0.75rem",
                          border: questionCorrect
                            ? "2px solid #28a745"
                            : "2px solid #dc3545",
                        }}
                      />
                      <div style={{ marginTop: "0.75rem" }}>
                        <div
                          style={{
                            padding: "0.75rem",
                            borderRadius: "4px",
                            backgroundColor: questionCorrect ? "#d4edda" : "#f8d7da",
                            border: `1px solid ${questionCorrect ? "#c3e6cb" : "#f5c6cb"}`,
                          }}
                        >
                          <div style={{ marginBottom: "0.5rem" }}>
                            <strong style={{ color: questionCorrect ? "#155724" : "#721c24" }}>
                              {questionCorrect ? "✓ Correct!" : "✗ Incorrect"}
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
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}

          <Card style={{ marginTop: "2rem", textAlign: "center", backgroundColor: "#f0f0f0" }}>
            <Card.Body>
              <h2>Preview Results</h2>
              <p style={{ fontSize: "1.5rem", marginTop: "1rem" }}>
                Score: {score} / {totalPoints}
              </p>
              <p style={{ fontSize: "1.2rem", marginTop: "0.5rem" }}>
                Percentage: {((score || 0) / totalPoints * 100).toFixed(1)}%
              </p>
              <div style={{ marginTop: "1rem" }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSubmitted(false);
                    setAnswers({});
                    setScore(null);
                    setCurrentQuestionIndex(0);
                  }}
                  style={{ marginRight: "0.5rem" }}
                >
                  Try Again
                </Button>
                <Button variant="secondary" onClick={() => router.push(`/Courses/${cid}/Quizzes/${qid}`)}>
                  Back to Quiz
                </Button>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}


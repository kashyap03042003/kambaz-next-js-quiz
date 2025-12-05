"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../store";
import * as client from "../../client";
import { Quiz, Question, QuizAttempt, MultipleChoiceQuestion, FillBlankQuestion } from "../../../../../types";
import { Button, Card, Form, Alert } from "react-bootstrap";

// Add custom styles for checkboxes and radio buttons with lighter borders
const checkboxRadioStyles = `
  #wd-quiz-take .form-check-input,
  #wd-quiz-take input[type="checkbox"],
  #wd-quiz-take input[type="radio"] {
    border: 2px solid #6c757d !important;
    background-color: #ffffff !important;
    width: 1.25em !important;
    height: 1.25em !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
    appearance: none !important;
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    cursor: pointer !important;
    margin-top: 0.15em !important;
    vertical-align: top !important;
    flex-shrink: 0 !important;
  }
  #wd-quiz-take .form-check-input:checked,
  #wd-quiz-take input[type="checkbox"]:checked,
  #wd-quiz-take input[type="radio"]:checked {
    background-color: #0d6efd !important;
    border-color: #6c757d !important;
    border-width: 2px !important;
  }
  #wd-quiz-take .form-check-input:checked[type="checkbox"]::before,
  #wd-quiz-take input[type="checkbox"]:checked::before {
    content: "✓" !important;
    display: block !important;
    color: #ffffff !important;
    font-weight: bold !important;
    text-align: center !important;
    line-height: 1.25em !important;
    font-size: 0.9em !important;
  }
  #wd-quiz-take .form-check-input:focus,
  #wd-quiz-take input[type="checkbox"]:focus,
  #wd-quiz-take input[type="radio"]:focus {
    border-color: #6c757d !important;
    border-width: 2px !important;
    box-shadow: 0 0 0 0.25rem rgba(108, 117, 125, 0.25) !important;
    outline: none !important;
  }
  #wd-quiz-take .form-check-input[type="radio"],
  #wd-quiz-take input[type="radio"] {
    border-radius: 50% !important;
    border: 2px solid #6c757d !important;
  }
  #wd-quiz-take .form-check-input[type="radio"]:checked,
  #wd-quiz-take input[type="radio"]:checked {
    background-color: #0d6efd !important;
    border-color: #6c757d !important;
    background-image: radial-gradient(circle, #ffffff 35%, transparent 35%) !important;
  }
  #wd-quiz-take .form-check-input[type="checkbox"],
  #wd-quiz-take input[type="checkbox"] {
    border-radius: 0.25rem !important;
    border: 2px solid #6c757d !important;
  }
  #wd-quiz-take .form-check-input:disabled,
  #wd-quiz-take input[type="checkbox"]:disabled,
  #wd-quiz-take input[type="radio"]:disabled {
    border-color: #adb5bd !important;
    border-width: 2px !important;
    opacity: 0.6 !important;
  }
  #wd-quiz-take .form-check {
    display: flex !important;
    align-items: flex-start !important;
    min-height: 1.5rem !important;
  }
  #wd-quiz-take .form-check-label {
    margin-left: 0.5em !important;
    padding-top: 0.1em !important;
    line-height: 1.5 !important;
  }
`;

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [shuffleMaps, setShuffleMaps] = useState<Record<string, { originalToShuffled: number[], shuffledToOriginal: number[] }>>({});

  useEffect(() => {
    if (qid) {
      loadQuiz();
    }
  }, [qid]);

  useEffect(() => {
    if (qid && quiz) {
      loadQuestions();
    }
  }, [qid, quiz]);

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

  // Inject styles for checkboxes and radio buttons
  useEffect(() => {
    const styleId = 'quiz-checkbox-radio-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = checkboxRadioStyles;
      document.head.appendChild(style);
    }
    return () => {
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    };
  }, []);

  // Prevent navigation away from quiz if not submitted
  useEffect(() => {
    if (!submitted && quiz && questions.length > 0) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'You have an active quiz in progress. Are you sure you want to leave? Your progress will be lost.';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [submitted, quiz, questions.length]);

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
      
      // Shuffle choices if shuffleAnswers is enabled
      if (quiz?.shuffleAnswers) {
        const shuffled: Question[] = [];
        const maps: Record<string, { originalToShuffled: number[], shuffledToOriginal: number[] }> = {};
        
        data.forEach((question: Question) => {
          if (question.type === "multiple-choice") {
            const mcq = question as MultipleChoiceQuestion;
            const originalChoices = [...mcq.choices];
            const indices = originalChoices.map((_, i) => i);
            
            // Shuffle the indices
            const shuffledIndices = [...indices];
            for (let i = shuffledIndices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
            }
            
            // Create shuffled choices array
            const shuffledChoices = shuffledIndices.map(idx => originalChoices[idx]);
            
            // Create mapping: original index -> shuffled index
            const originalToShuffled: number[] = new Array(originalChoices.length);
            const shuffledToOriginal: number[] = new Array(originalChoices.length);
            shuffledIndices.forEach((originalIdx, shuffledIdx) => {
              originalToShuffled[originalIdx] = shuffledIdx;
              shuffledToOriginal[shuffledIdx] = originalIdx;
            });
            
            maps[question._id] = { originalToShuffled, shuffledToOriginal };
            
            // Create new question with shuffled choices
            shuffled.push({
              ...question,
              choices: shuffledChoices,
            } as MultipleChoiceQuestion);
          } else {
            shuffled.push(question);
          }
        });
        
        setShuffledQuestions(shuffled);
        setShuffleMaps(maps);
      } else {
        setShuffledQuestions(data);
        setShuffleMaps({});
      }
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

  // Parse fill-in-blank question to extract blanks
  const parseFillBlankQuestion = (questionText: string): { parts: Array<{ type: 'text' | 'blank'; content: string; index?: number }>; blankCount: number } => {
    const parts: Array<{ type: 'text' | 'blank'; content: string; index?: number }> = [];
    let blankCount = 0;
    let currentIndex = 0;
    
    // Match both ___ and [___] patterns
    const regex = /(___|\[___\])/g;
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(questionText)) !== null) {
      // Add text before the blank
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: questionText.substring(lastIndex, match.index)
        });
      }
      
      // Add the blank
      blankCount++;
      parts.push({
        type: 'blank',
        content: match[0],
        index: blankCount
      });
      
      lastIndex = regex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < questionText.length) {
      parts.push({
        type: 'text',
        content: questionText.substring(lastIndex)
      });
    }
    
    // If no blanks found, treat entire question as text
    if (blankCount === 0) {
      parts.push({ type: 'text', content: questionText });
    }
    
    return { parts, blankCount };
  };

  const goToNextQuestion = () => {
    const displayQuestions = shuffledQuestions.length > 0 ? shuffledQuestions : questions;
    if (currentQuestionIndex < displayQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
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

  // Show all questions if submitted (for review)
  const showAllQuestions = submitted;

  if (showAllQuestions) {
    // Show all questions after submission
    return (
      <div id="wd-quiz-take" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Button
            variant="link"
            onClick={() => router.push(`/Courses/${cid}/Quizzes/${qid}`)}
            style={{ textDecoration: "none", padding: 0, color: "#0d6efd" }}
          >
            ← Back to Quiz
          </Button>
        </div>

        <Card style={{ marginBottom: "2rem" }}>
          <Card.Body>
            <h2>{quiz.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: quiz.description || "" }} />
          </Card.Body>
        </Card>

        {(shuffledQuestions.length > 0 ? shuffledQuestions : questions).map((question, index) => {
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
                <div dangerouslySetInnerHTML={{ __html: question.question }} />

                {question.type === "multiple-choice" && (
                  <div style={{ marginTop: "1rem" }}>
                    {(question as MultipleChoiceQuestion).choices.map((choice: string, shuffledIdx: number) => {
                      // Get original question for correct indices
                      const originalQuestion = questions.find(q => q._id === question._id) as MultipleChoiceQuestion;
                      const originalCorrectIndices = originalQuestion ? getCorrectIndices(originalQuestion) : [];
                      
                      // Map correct indices to shuffled positions
                      let correctIndices: number[] = [];
                      if (quiz?.shuffleAnswers && shuffleMaps[question._id]) {
                        correctIndices = originalCorrectIndices.map(origIdx => shuffleMaps[question._id].originalToShuffled[origIdx]);
                      } else {
                        correctIndices = originalCorrectIndices;
                      }
                      
                      const isCorrectAnswer = correctIndices.includes(shuffledIdx);
                      
                      // Map shuffled index to original index for answer checking
                      let originalIdx = shuffledIdx;
                      if (quiz?.shuffleAnswers && shuffleMaps[question._id]) {
                        originalIdx = shuffleMaps[question._id].shuffledToOriginal[shuffledIdx];
                      }
                      
                      const isSelected = Array.isArray(answers[question._id])
                        ? answers[question._id].includes(originalIdx)
                        : answers[question._id] === originalIdx;

                      return (
                        <div key={shuffledIdx} style={{ marginBottom: "0.5rem" }}>
                          <Form.Check
                            type={correctIndices.length === 1 ? "radio" : "checkbox"}
                            name={correctIndices.length === 1 ? `question-${question._id}` : undefined}
                            id={`question-${question._id}-choice-${shuffledIdx}`}
                            label={
                              <span>
                                {choice}
                                {submitted && isCorrectAnswer && (
                                  <span style={{ color: "green", marginLeft: "0.5rem" }}>(Correct Answer)</span>
                                )}
                              </span>
                            }
                            checked={isSelected}
                            disabled={true}
                          />
                        </div>
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
                    {submitted && (question as any).correctAnswer === true && (
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
                    {submitted && (question as any).correctAnswer === false && (
                      <span style={{ color: "green", marginLeft: "0.5rem" }}>(Correct Answer)</span>
                    )}
                  </div>
                )}

                {question.type === "fill-blank" && (
                  <div style={{ marginTop: "1rem" }}>
                    {(() => {
                      const { parts, blankCount } = parseFillBlankQuestion(question.question);
                      const fillBlankAnswers = answers[question._id] || {};
                      
                      return (
                        <div>
                          {parts.map((part, partIndex) => {
                            if (part.type === 'text') {
                              return <span key={partIndex} dangerouslySetInnerHTML={{ __html: part.content }} />;
                            } else {
                              const blankIndex = part.index!;
                              const studentAnswer = fillBlankAnswers[blankIndex] || "";
                              const correctAnswers = (question as FillBlankQuestion).correctAnswers || [];
                              const isCorrect = submitted && correctAnswers.some(ca => 
                                ca.toLowerCase().trim() === studentAnswer.toLowerCase().trim()
                              );
                              
                              return (
                                <span key={partIndex} style={{ display: "inline-block", margin: "0 0.25rem" }}>
                                  <Form.Control
                                    type="text"
                                    value={studentAnswer}
                                    disabled={true}
                                    style={{
                                      display: "inline-block",
                                      width: "150px",
                                      border: submitted
                                        ? isCorrect
                                          ? "2px solid #28a745"
                                          : "2px solid #dc3545"
                                        : "1px solid #ced4da",
                                    }}
                                  />
                                  {submitted && !isCorrect && (
                                    <span style={{ fontSize: "0.75rem", marginLeft: "0.5rem", color: "#dc3545" }}>
                                      Correct: {correctAnswers.join(" or ")}
                                    </span>
                                  )}
                                </span>
                              );
                            }
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </Card.Body>
            </Card>
          );
        })}

        {attempt && (
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
              <Button
                variant="secondary"
                onClick={() => router.push(`/Courses/${cid}/Quizzes`)}
                style={{ marginTop: "1rem" }}
              >
                Back to Quizzes
              </Button>
            </Card.Body>
          </Card>
        )}
      </div>
    );
  }

  // Show one question at a time when taking quiz
  // Use shuffled questions if shuffle is enabled, otherwise use original questions
  const displayQuestions = shuffledQuestions.length > 0 ? shuffledQuestions : questions;
  const currentQuestion = displayQuestions[currentQuestionIndex];
  if (!currentQuestion) {
    return <div>No questions available</div>;
  }

  const isQuestionCorrect = submitted ? isCorrect(currentQuestion, answers[currentQuestion._id]) : false;
  const mcq = currentQuestion as MultipleChoiceQuestion;
  
  // Get correct indices - if shuffled, map them to shuffled positions
  let correctIndices: number[] = [];
  if (currentQuestion.type === "multiple-choice") {
    const originalIndices = getCorrectIndices(questions[currentQuestionIndex] as MultipleChoiceQuestion);
    if (quiz?.shuffleAnswers && shuffleMaps[currentQuestion._id]) {
      // Map original indices to shuffled positions
      correctIndices = originalIndices.map(origIdx => shuffleMaps[currentQuestion._id].originalToShuffled[origIdx]);
    } else {
      correctIndices = originalIndices;
    }
  }
  const isSingleCorrect = correctIndices.length === 1;

  const handleBackNavigation = () => {
    if (!submitted) {
      const confirmed = window.confirm(
        "You have an active quiz in progress. Are you sure you want to leave? Your progress will be lost."
      );
      if (!confirmed) {
        return;
      }
    }
    router.push(`/Courses/${cid}/Quizzes/${qid}`);
  };

  return (
    <div id="wd-quiz-take" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <Button
          variant="link"
          onClick={handleBackNavigation}
          style={{ textDecoration: "none", padding: 0, color: "#0d6efd" }}
        >
          ← Back to Quiz
        </Button>
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
        </Card.Body>
      </Card>

      {/* Question Navigation */}
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>Question {currentQuestionIndex + 1} of {displayQuestions.length}</strong>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {displayQuestions.map((_, index) => (
            <Button
              key={index}
              variant={index === currentQuestionIndex ? "primary" : "outline-secondary"}
              size="sm"
              onClick={() => goToQuestion(index)}
              style={{ minWidth: "40px" }}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>

      <Card
        style={{
          marginBottom: "2rem",
          borderLeft: submitted
            ? isQuestionCorrect
              ? "4px solid green"
              : "4px solid red"
            : "none",
        }}
      >
        <Card.Body>
          <h3>
            Question {currentQuestionIndex + 1} ({currentQuestion.points} points)
            {submitted && (
              <span style={{ marginLeft: "1rem", color: isQuestionCorrect ? "green" : "red" }}>
                {isQuestionCorrect ? "✓ Correct" : "✗ Incorrect"}
              </span>
            )}
          </h3>
          
          {currentQuestion.type === "fill-blank" ? (
            <div>
              {(() => {
                const { parts, blankCount } = parseFillBlankQuestion(currentQuestion.question);
                const fillBlankAnswers = answers[currentQuestion._id] || {};
                
                return (
                  <div>
                    {parts.map((part, partIndex) => {
                      if (part.type === 'text') {
                        return <span key={partIndex} dangerouslySetInnerHTML={{ __html: part.content }} />;
                      } else {
                        const blankIndex = part.index!;
                        const studentAnswer = fillBlankAnswers[blankIndex] || "";
                        
                        return (
                          <span key={partIndex} style={{ display: "inline-block", margin: "0 0.25rem" }}>
                            <Form.Control
                              type="text"
                              value={studentAnswer}
                              onChange={(e) => {
                                setAnswers({
                                  ...answers,
                                  [currentQuestion._id]: {
                                    ...fillBlankAnswers,
                                    [blankIndex]: e.target.value
                                  }
                                });
                              }}
                              disabled={submitted}
                              placeholder={`Blank ${blankIndex}`}
                              style={{
                                display: "inline-block",
                                width: "150px",
                                    }}
                                  />
                                </span>
                        );
                      }
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: currentQuestion.question }} />
          )}

          {currentQuestion.type === "multiple-choice" && (
            <div style={{ marginTop: "1rem" }}>
              {mcq.choices.map((choice: string, shuffledIdx: number) => {
                const isCorrectAnswer = correctIndices.includes(shuffledIdx);
                
                // Map shuffled index to original index for answer storage
                let originalIdx = shuffledIdx;
                if (quiz?.shuffleAnswers && shuffleMaps[currentQuestion._id]) {
                  originalIdx = shuffleMaps[currentQuestion._id].shuffledToOriginal[shuffledIdx];
                }
                
                // Check if this original index is selected
                const isSelected = isSingleCorrect
                  ? answers[currentQuestion._id] === originalIdx
                  : Array.isArray(answers[currentQuestion._id])
                  ? answers[currentQuestion._id].includes(originalIdx)
                  : false;

                return (
                  <div key={shuffledIdx} style={{ marginBottom: "0.5rem" }}>
                    <Form.Check
                      type={isSingleCorrect ? "radio" : "checkbox"}
                      name={isSingleCorrect ? `question-${currentQuestion._id}` : undefined}
                      id={`question-${currentQuestion._id}-choice-${shuffledIdx}`}
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
                        if (isSingleCorrect) {
                          // Store original index, not shuffled index
                          setAnswers({ ...answers, [currentQuestion._id]: originalIdx });
                        } else {
                          const currentAnswers = Array.isArray(answers[currentQuestion._id])
                            ? answers[currentQuestion._id]
                            : answers[currentQuestion._id] !== undefined
                            ? [answers[currentQuestion._id]]
                            : [];
                          if (e.target.checked) {
                            setAnswers({ ...answers, [currentQuestion._id]: [...currentAnswers, originalIdx] });
                          } else {
                            setAnswers({ ...answers, [currentQuestion._id]: currentAnswers.filter((a: number) => a !== originalIdx) });
                          }
                        }
                      }}
                      disabled={submitted}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {currentQuestion.type === "true-false" && (
            <div style={{ marginTop: "1rem" }}>
              <Form.Check
                type="radio"
                name={`question-${currentQuestion._id}`}
                id={`question-${currentQuestion._id}-true`}
                label="True"
                checked={answers[currentQuestion._id] === true}
                onChange={() => setAnswers({ ...answers, [currentQuestion._id]: true })}
                disabled={submitted}
                style={{ marginBottom: "0.5rem" }}
              />
              {submitted && (currentQuestion as any).correctAnswer === true && (
                <span style={{ color: "green", marginLeft: "0.5rem" }}>(Correct Answer)</span>
              )}
              <Form.Check
                type="radio"
                name={`question-${currentQuestion._id}`}
                id={`question-${currentQuestion._id}-false`}
                label="False"
                checked={answers[currentQuestion._id] === false}
                onChange={() => setAnswers({ ...answers, [currentQuestion._id]: false })}
                disabled={submitted}
              />
              {submitted && (currentQuestion as any).correctAnswer === false && (
                <span style={{ color: "green", marginLeft: "0.5rem" }}>(Correct Answer)</span>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Navigation Buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
        <Button
          variant="secondary"
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0 || submitted}
        >
          ← Previous
        </Button>
        {currentQuestionIndex < questions.length - 1 ? (
          <Button
            variant="primary"
            onClick={goToNextQuestion}
            disabled={submitted}
          >
            Next →
          </Button>
        ) : (
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={submitted}
            size="lg"
          >
            Submit Quiz
          </Button>
        )}
      </div>
    </div>
  );
}

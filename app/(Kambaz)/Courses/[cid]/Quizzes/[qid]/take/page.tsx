"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../store";
import * as client from "../../client";
import { Quiz, Question, QuizAttempt, MultipleChoiceQuestion, FillBlankQuestion, TrueFalseQuestion, AnswerValue } from "../../../../../types";
import { Button, Card, Form, Alert } from "react-bootstrap";

export default function QuizTake() {
  const { cid, qid } = useParams();
  const router = useRouter();
  const { currentUser } = useSelector((state: RootState) => state.accountReducer);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
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
      
      if (quiz?.shuffleAnswers) {
        const shuffled: Question[] = [];
        const maps: Record<string, { originalToShuffled: number[], shuffledToOriginal: number[] }> = {};
        
        data.forEach((question: Question) => {
          if (question.type === "multiple-choice") {
            const mcq = question as MultipleChoiceQuestion;
            const originalChoices = [...mcq.choices];
            const indices = originalChoices.map((_, i) => i);
            
            const shuffledIndices = [...indices];
            for (let i = shuffledIndices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
            }
            
            const shuffledChoices = shuffledIndices.map(idx => originalChoices[idx]);
            
            const originalToShuffled: number[] = new Array(originalChoices.length);
            const shuffledToOriginal: number[] = new Array(originalChoices.length);
            shuffledIndices.forEach((originalIdx, shuffledIdx) => {
              originalToShuffled[originalIdx] = shuffledIdx;
              shuffledToOriginal[shuffledIdx] = originalIdx;
            });
            
            maps[question._id] = { originalToShuffled, shuffledToOriginal };
            
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
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message 
          || (error as { response?: { data?: { message?: string; error?: string } } }).response?.data?.error
        : undefined;
      alert(errorMessage || "Failed to submit quiz");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isCorrect = (question: Question, answer: AnswerValue): boolean => {
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

  const parseFillBlankQuestion = (questionText: string): { parts: Array<{ type: 'text' | 'blank'; content: string; index?: number }>; blankCount: number } => {
    const parts: Array<{ type: 'text' | 'blank'; content: string; index?: number }> = [];
    let blankCount = 0;
    
    const regex = /(___|\[___\])/g;
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(questionText)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: questionText.substring(lastIndex, match.index)
        });
      }
      
      blankCount++;
      parts.push({
        type: 'blank',
        content: match[0],
        index: blankCount
      });
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < questionText.length) {
      parts.push({
        type: 'text',
        content: questionText.substring(lastIndex)
      });
    }
    
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
      <div className="p-[20px] max-w-[500px] my-20 mx-auto">
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
            <Button variant="primary" onClick={handleAccessCodeSubmit} className="w-full">
              Continue
            </Button>
          </Card.Body>
        </Card>
      </div>
    );
  }

  const showAllQuestions = submitted;

  if (showAllQuestions) {
    return (
      <div id="wd-quiz-take" className="p-[20px]">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="link"
            onClick={() => router.push(`/Courses/${cid}/Quizzes/${qid}`)}
            className="no-underline p-0 text-blue-600"
          >
            ← Back to Quiz
          </Button>
        </div>

        <Card className="mb-8">
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
              className={`mb-4 ${submitted ? (isQuestionCorrect ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500") : ""}`}
            >
              <Card.Body>
                <h3>
                  Question {index + 1} ({question.points} points)
                  {submitted && (
                    <span className={`ml-4 ${isQuestionCorrect ? "text-green-600" : "text-red-600"}`}>
                      {isQuestionCorrect ? <><span style={{ color: '#16a34a', marginLeft: '0.25rem' }}>✓</span> Correct</> : <><span style={{ color: '#dc2626', marginLeft: '0.25rem' }}>✗</span> Incorrect</>}
                    </span>
                  )}
                </h3>
                <div dangerouslySetInnerHTML={{ __html: question.question }} />

                {question.type === "multiple-choice" && (
                  <div className="mt-4">
                    {(question as MultipleChoiceQuestion).choices.map((choice: string, shuffledIdx: number) => {
                      // Get original question for correct indices
                      const originalQuestion = questions.find(q => q._id === question._id) as MultipleChoiceQuestion;
                      const originalCorrectIndices = originalQuestion ? getCorrectIndices(originalQuestion) : [];
                      
                      let correctIndices: number[] = [];
                      if (quiz?.shuffleAnswers && shuffleMaps[question._id]) {
                        correctIndices = originalCorrectIndices.map(origIdx => shuffleMaps[question._id].originalToShuffled[origIdx]);
                      } else {
                        correctIndices = originalCorrectIndices;
                      }
                      
                      const isCorrectAnswer = correctIndices.includes(shuffledIdx);
                      
                      let originalIdx = shuffledIdx;
                      if (quiz?.shuffleAnswers && shuffleMaps[question._id]) {
                        originalIdx = shuffleMaps[question._id].shuffledToOriginal[shuffledIdx];
                      }
                      
                      const answerValue = answers[question._id];
                      const isSelected = Array.isArray(answerValue)
                        ? answerValue.includes(originalIdx)
                        : answerValue === originalIdx;

                      return (
                        <div key={shuffledIdx} className="mb-2">
                          <Form.Check
                            type={correctIndices.length === 1 ? "radio" : "checkbox"}
                            name={correctIndices.length === 1 ? `question-${question._id}` : undefined}
                            id={`question-${question._id}-choice-${shuffledIdx}`}
                            label={
                              <span>
                                {choice}
                                {submitted && isCorrectAnswer && (
                                  <span className="text-green-600 ml-2">(Correct Answer)</span>
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
                  <div className="mt-4">
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <Form.Check
                        type="radio"
                        name={`question-${question._id}`}
                        id={`question-${question._id}-true`}
                        label="True"
                        checked={answers[question._id] === true}
                        disabled={true}
                        style={{ margin: 0 }}
                      />
                      {submitted && (question as TrueFalseQuestion).correctAnswer === true && (
                        <span className="text-green-600" style={{ marginLeft: '0.5rem' }}>(Correct Answer)</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Form.Check
                        type="radio"
                        name={`question-${question._id}`}
                        id={`question-${question._id}-false`}
                        label="False"
                        checked={answers[question._id] === false}
                        disabled={true}
                        style={{ margin: 0 }}
                      />
                      {submitted && (question as TrueFalseQuestion).correctAnswer === false && (
                        <span className="text-green-600" style={{ marginLeft: '0.5rem' }}>(Correct Answer)</span>
                      )}
                    </div>
                  </div>
                )}

                {question.type === "fill-blank" && (
                  <div className="mt-4" style={{ lineHeight: '2' }}>
                    {(() => {
                      const { parts, blankCount } = parseFillBlankQuestion(question.question);
                      const answerValue = answers[question._id];
                      const fillBlankAnswers: Record<string, string> = (typeof answerValue === 'object' && answerValue !== null && !Array.isArray(answerValue))
                        ? answerValue as Record<string, string>
                        : {};
                      
                      return (
                        <div style={{ fontSize: '1rem' }}>
                          {parts.map((part, partIndex) => {
                            if (part.type === 'text') {
                              return <span key={partIndex} dangerouslySetInnerHTML={{ __html: part.content }} />;
                            } else {
                              const blankIndex = part.index!;
                              const studentAnswer = fillBlankAnswers[blankIndex] || "";
                              const correctAnswers = (question as FillBlankQuestion).correctAnswers || [];
                              // Each blank maps to one answer: blank 1 -> index 0, blank 2 -> index 1, etc.
                              const correctAnswer = correctAnswers[blankIndex - 1] || "";
                              const isCorrect = submitted && correctAnswer.toLowerCase().trim() === studentAnswer.toLowerCase().trim();
                              
                              return (
                                <span key={partIndex} style={{ display: 'inline-block', margin: '0 0.5rem', verticalAlign: 'middle' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Form.Control
                                      type="text"
                                      value={studentAnswer}
                                      disabled={true}
                                      style={{
                                        minWidth: '180px',
                                        display: 'inline-block',
                                        padding: '0.5rem',
                                        fontSize: '1rem',
                                        border: submitted 
                                          ? (isCorrect ? '2px solid #16a34a' : '2px solid #dc2626')
                                          : '1px solid #d1d5db',
                                        borderRadius: '0.25rem'
                                      }}
                                    />
                                    {submitted && !isCorrect && (
                                      <span style={{ fontSize: '0.875rem', color: '#dc2626', whiteSpace: 'nowrap' }}>
                                        ✓ {correctAnswer}
                                      </span>
                                    )}
                                    {submitted && isCorrect && (
                                      <span style={{ fontSize: '0.875rem', color: '#16a34a', whiteSpace: 'nowrap' }}>
                                        ✓ Correct
                                      </span>
                                    )}
                                  </div>
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
          <Card className="mt-8 text-center bg-gray-100">
            <Card.Body>
              <h2>Quiz Results</h2>
              <p className="text-2xl mt-4">
                Score: {attempt.score} / {attempt.totalPoints}
              </p>
              <p className="text-xl mt-2">
                Percentage: {((attempt.score / attempt.totalPoints) * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-gray-600">Attempt #{attempt.attemptNumber}</p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/Courses/${cid}/Quizzes`)}
                >
                  Back to Quizzes
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    );
  }

  const displayQuestions = shuffledQuestions.length > 0 ? shuffledQuestions : questions;
  const currentQuestion = displayQuestions[currentQuestionIndex];
  if (!currentQuestion) {
    return <div>No questions available</div>;
  }

  const isQuestionCorrect = submitted ? isCorrect(currentQuestion, answers[currentQuestion._id]) : false;
  const mcq = currentQuestion as MultipleChoiceQuestion;
  
  let correctIndices: number[] = [];
  if (currentQuestion.type === "multiple-choice") {
    const originalIndices = getCorrectIndices(questions[currentQuestionIndex] as MultipleChoiceQuestion);
    if (quiz?.shuffleAnswers && shuffleMaps[currentQuestion._id]) {
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
    <div id="wd-quiz-take" className="p-[20px]">
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="link"
          onClick={handleBackNavigation}
          className="no-underline p-0 text-blue-600"
        >
          ← Back to Quiz
        </Button>
        {timeRemaining !== null && !submitted && (
          <Alert variant="warning" className="m-0">
            <strong>Time Remaining: {formatTime(timeRemaining)}</strong>
          </Alert>
        )}
      </div>

      <Card className="mb-8">
        <Card.Body>
          <h2>{quiz.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: quiz.description || "" }} />
        </Card.Body>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', marginBottom: '1rem' }}>
        <div>
          <strong>Question {currentQuestionIndex + 1} of {displayQuestions.length}</strong>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {displayQuestions.map((_, index) => (
            <Button
              key={index}
              variant={index === currentQuestionIndex ? "primary" : "outline-secondary"}
              size="sm"
              onClick={() => goToQuestion(index)}
              style={{ minWidth: '40px' }}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>

      <Card
        className={`mb-8 ${submitted ? (isQuestionCorrect ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500") : ""}`}
      >
        <Card.Body>
          <h3>
            Question {currentQuestionIndex + 1} ({currentQuestion.points} points)
            {submitted && (
              <span className={`ml-4 ${isQuestionCorrect ? "text-green-600" : "text-red-600"}`}>
                {isQuestionCorrect ? <><span style={{ color: '#16a34a', marginLeft: '0.25rem' }}>✓</span> Correct</> : <><span style={{ color: '#dc2626', marginLeft: '0.25rem' }}>✗</span> Incorrect</>}
              </span>
            )}
          </h3>
          
          {currentQuestion.type === "fill-blank" ? (
            <div style={{ lineHeight: '2' }}>
              {(() => {
                const { parts, blankCount } = parseFillBlankQuestion(currentQuestion.question);
                const answerValue = answers[currentQuestion._id];
                const fillBlankAnswers: Record<string, string> = (typeof answerValue === 'object' && answerValue !== null && !Array.isArray(answerValue))
                  ? answerValue as Record<string, string>
                  : {};
                
                return (
                  <div style={{ fontSize: '1rem' }}>
                    {parts.map((part, partIndex) => {
                      if (part.type === 'text') {
                        return <span key={partIndex} dangerouslySetInnerHTML={{ __html: part.content }} />;
                      } else {
                        const blankIndex = part.index!;
                        const studentAnswer = fillBlankAnswers[blankIndex] || "";
                        const correctAnswers = (currentQuestion as FillBlankQuestion).correctAnswers || [];
                        // Each blank maps to one answer: blank 1 -> index 0, blank 2 -> index 1, etc.
                        const correctAnswer = correctAnswers[blankIndex - 1] || "";
                        const isCorrect = submitted && correctAnswer.toLowerCase().trim() === studentAnswer.toLowerCase().trim();
                        
                        return (
                          <span key={partIndex} style={{ display: 'inline-block', margin: '0 0.5rem', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                                placeholder=""
                                style={{
                                  minWidth: '180px',
                                  display: 'inline-block',
                                  padding: '0.5rem',
                                  fontSize: '1rem',
                                  border: submitted 
                                    ? (isCorrect ? '2px solid #16a34a' : '2px solid #dc2626')
                                    : '1px solid #d1d5db',
                                  borderRadius: '0.25rem'
                                }}
                              />
                              {submitted && !isCorrect && (
                                <span style={{ fontSize: '0.875rem', color: '#dc2626', whiteSpace: 'nowrap' }}>
                                  ✓ {correctAnswer}
                                </span>
                              )}
                              {submitted && isCorrect && (
                                <span style={{ fontSize: '0.875rem', color: '#16a34a', whiteSpace: 'nowrap' }}>
                                  ✓ Correct
                                </span>
                              )}
                            </div>
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
            <div className="mt-4">
              {mcq.choices.map((choice: string, shuffledIdx: number) => {
                const isCorrectAnswer = correctIndices.includes(shuffledIdx);
                
                let originalIdx = shuffledIdx;
                if (quiz?.shuffleAnswers && shuffleMaps[currentQuestion._id]) {
                  originalIdx = shuffleMaps[currentQuestion._id].shuffledToOriginal[shuffledIdx];
                }
                
                const answerValue = answers[currentQuestion._id];
                const isSelected = isSingleCorrect
                  ? answerValue === originalIdx
                  : Array.isArray(answerValue)
                  ? answerValue.includes(originalIdx)
                  : false;

                return (
                  <div key={shuffledIdx} className="mb-2">
                    <Form.Check
                      type={isSingleCorrect ? "radio" : "checkbox"}
                      name={isSingleCorrect ? `question-${currentQuestion._id}` : undefined}
                      id={`question-${currentQuestion._id}-choice-${shuffledIdx}`}
                      label={
                        <span>
                          {choice}
                          {submitted && isCorrectAnswer && (
                            <span className="text-green-600 ml-2">(Correct Answer)</span>
                          )}
                        </span>
                      }
                      checked={isSelected}
                      onChange={(e) => {
                        if (submitted) return;
                        if (isSingleCorrect) {
                          setAnswers({ ...answers, [currentQuestion._id]: originalIdx });
                        } else {
                          const currentAnswerValue = answers[currentQuestion._id];
                          const currentAnswers: number[] = Array.isArray(currentAnswerValue)
                            ? currentAnswerValue
                            : currentAnswerValue !== undefined
                            ? [currentAnswerValue as number]
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
            <div className="mt-4">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <Form.Check
                  type="radio"
                  name={`question-${currentQuestion._id}`}
                  id={`question-${currentQuestion._id}-true`}
                  label="True"
                  checked={answers[currentQuestion._id] === true}
                  onChange={() => setAnswers({ ...answers, [currentQuestion._id]: true })}
                  disabled={submitted}
                  style={{ margin: 0 }}
                />
                {submitted && (currentQuestion as TrueFalseQuestion).correctAnswer === true && (
                  <span className="text-green-600" style={{ marginLeft: '0.5rem' }}>(Correct Answer)</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Form.Check
                  type="radio"
                  name={`question-${currentQuestion._id}`}
                  id={`question-${currentQuestion._id}-false`}
                  label="False"
                  checked={answers[currentQuestion._id] === false}
                  onChange={() => setAnswers({ ...answers, [currentQuestion._id]: false })}
                  disabled={submitted}
                  style={{ margin: 0 }}
                />
                {submitted && (currentQuestion as TrueFalseQuestion).correctAnswer === false && (
                  <span className="text-green-600" style={{ marginLeft: '0.5rem' }}>(Correct Answer)</span>
                )}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
        <Button
          variant="secondary"
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0 || submitted}
        >
          ← Previous
        </Button>
        <div style={{ display: 'flex', gap: '1rem' }}>
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
    </div>
  );
}

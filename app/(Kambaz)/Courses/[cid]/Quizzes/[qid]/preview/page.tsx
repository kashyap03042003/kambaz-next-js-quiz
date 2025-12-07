"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../store";
import * as client from "../../client";
import { Quiz, Question, MultipleChoiceQuestion, TrueFalseQuestion, FillBlankQuestion, AnswerValue } from "../../../../../types";
import { Button, Card, Form } from "react-bootstrap";

export default function QuizPreview() {
  const { cid, qid } = useParams();
  const router = useRouter();
  const { currentUser } = useSelector((state: RootState) => state.accountReducer);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
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
    let calculatedScore = 0;
    questions.forEach((question) => {
      const answer = answers[question._id];
      if (!answer) return;

      if (question.type === "multiple-choice") {
        const mcq = question as MultipleChoiceQuestion;
        const correctIndices = mcq.correctChoiceIndices && mcq.correctChoiceIndices.length > 0
          ? mcq.correctChoiceIndices
          : (mcq.correctChoiceIndex !== undefined ? [mcq.correctChoiceIndex] : []);
        
        const studentAnswers: number[] = Array.isArray(answer) ? (answer as number[]) : [answer as number];
        const correctSet = new Set(correctIndices);
        const studentSet = new Set(studentAnswers);
        const isCorrect = studentAnswers.length === correctIndices.length &&
          studentAnswers.every((idx: number) => correctSet.has(idx)) &&
          correctIndices.every((idx: number) => studentSet.has(idx));
        
        if (isCorrect) {
          calculatedScore += question.points;
        }
      } else if (question.type === "true-false") {
        const tfq = question as TrueFalseQuestion;
        if (answer === tfq.correctAnswer) {
          calculatedScore += question.points;
        }
      } else if (question.type === "fill-blank") {
        const fbq = question as FillBlankQuestion;
        const answerStr = String(answer).trim();
        // For fill-blank, check if all blanks are correct
        const fillBlankAnswers: Record<string, string> = (typeof answer === 'object' && answer !== null && !Array.isArray(answer))
          ? answer as Record<string, string>
          : {};
        const allCorrect = Object.keys(fillBlankAnswers).every(blankIndex => {
          const studentAnswer = fillBlankAnswers[blankIndex].toLowerCase().trim();
          const correctAnswer = fbq.correctAnswers[parseInt(blankIndex) - 1]?.toLowerCase().trim() || "";
          return correctAnswer === studentAnswer;
        });
        if (allCorrect && Object.keys(fillBlankAnswers).length === fbq.correctAnswers.length) {
          calculatedScore += question.points;
        }
      }
    });

    setScore(calculatedScore);
    setSubmitted(true);
  };

  const isCorrect = (question: Question, answer: AnswerValue): boolean => {
    if (question.type === "multiple-choice") {
      const mcq = question as MultipleChoiceQuestion;
      const correctIndices = mcq.correctChoiceIndices && mcq.correctChoiceIndices.length > 0
        ? mcq.correctChoiceIndices
        : (mcq.correctChoiceIndex !== undefined ? [mcq.correctChoiceIndex] : []);
      
      const studentAnswers: number[] = Array.isArray(answer) ? (answer as number[]) : [answer as number];
      const correctSet = new Set(correctIndices);
      const studentSet = new Set(studentAnswers);
      return studentAnswers.length === correctIndices.length &&
        studentAnswers.every((idx: number) => correctSet.has(idx)) &&
        correctIndices.every((idx: number) => studentSet.has(idx));
    } else if (question.type === "true-false") {
      const tfq = question as TrueFalseQuestion;
      return answer === tfq.correctAnswer;
    } else if (question.type === "fill-blank") {
      const fbq = question as FillBlankQuestion;
      const fillBlankAnswers: Record<string, string> = (typeof answer === 'object' && answer !== null && !Array.isArray(answer))
        ? answer as Record<string, string>
        : {};
      // Check if all blanks are correct
      return Object.keys(fillBlankAnswers).every(blankIndex => {
        const studentAnswer = fillBlankAnswers[blankIndex].toLowerCase().trim();
        const correctAnswer = fbq.correctAnswers[parseInt(blankIndex) - 1]?.toLowerCase().trim() || "";
        return correctAnswer === studentAnswer;
      }) && Object.keys(fillBlankAnswers).length === fbq.correctAnswers.length;
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
    <div id="wd-quiz-preview" className="p-[20px]">
      <div className="mb-4">
        <Link href={`/Courses/${cid}/Quizzes/${qid}`}>← Back to Quiz</Link>
      </div>

      <Card className="mb-8">
        <Card.Body>
          <h2>Preview: {quiz.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: quiz.description || "" }} />
          <p className="mt-4 text-gray-600">
            This is how students will see the quiz. You can answer questions to test the quiz.
          </p>
        </Card.Body>
      </Card>

      {!submitted ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', marginBottom: '1rem' }}>
            <div>
              <strong>Question {currentQuestionIndex + 1} of {questions.length}</strong>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {questions.map((_, index) => (
                <Button
                  key={index}
                  variant={index === currentQuestionIndex ? "primary" : "outline-primary"}
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(index)}
                  style={{ minWidth: '40px' }}
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
            className={`mb-4 ${submitted ? (questionCorrect ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500") : ""}`}
          >
            <Card.Body>
              <h3>
                Question {currentQuestionIndex + 1} ({question.points} points)
              </h3>
              {question.type !== "fill-blank" && (
                <div 
                  dangerouslySetInnerHTML={{ __html: question.question }} 
                />
              )}

              {question.type === "multiple-choice" && (
                <div className="mt-4">
                  {(question as MultipleChoiceQuestion).choices.map((choice: string, i: number) => {
                    const mcq = question as MultipleChoiceQuestion;
                    const correctIndices = getCorrectIndices(mcq);
                    const isCorrectAnswer = correctIndices.includes(i);
                    const answerValue = answers[question._id];
                    const isSelected = Array.isArray(answerValue)
                      ? (answerValue as number[]).includes(i)
                      : answerValue === i;

                    return (
                      <Form.Check
                        key={i}
                        type="checkbox"
                        id={`question-${question._id}-choice-${i}`}
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
                          const currentAnswerValue = answers[question._id];
                          const currentAnswers: number[] = Array.isArray(currentAnswerValue)
                            ? (currentAnswerValue as number[])
                            : currentAnswerValue !== undefined
                            ? [currentAnswerValue as number]
                            : [];
                          if (e.target.checked) {
                            setAnswers({ ...answers, [question._id]: [...currentAnswers, i] });
                          } else {
                            setAnswers({ ...answers, [question._id]: currentAnswers.filter((a: number) => a !== i) });
                          }
                        }}
                        disabled={submitted}
                        className="mb-2"
                      />
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
                      onChange={() => setAnswers({ ...answers, [question._id]: true })}
                      disabled={submitted}
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
                      onChange={() => setAnswers({ ...answers, [question._id]: false })}
                      disabled={submitted}
                      style={{ margin: 0 }}
                    />
                    {submitted && (question as TrueFalseQuestion).correctAnswer === false && (
                      <span className="text-green-600" style={{ marginLeft: '0.5rem' }}>(Correct Answer)</span>
                    )}
                  </div>
                </div>
              )}

              {question.type === "fill-blank" && (() => {
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

                const { parts, blankCount } = parseFillBlankQuestion(question.question);
                const answerValue = answers[question._id];
                const fillBlankAnswers: Record<string, string> = (typeof answerValue === 'object' && answerValue !== null && !Array.isArray(answerValue))
                  ? answerValue as Record<string, string>
                  : {};
                
                return (
                  <div className="mt-4" style={{ lineHeight: '2' }}>
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
                                  onChange={(e) => {
                                    setAnswers({
                                      ...answers,
                                      [question._id]: {
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
                    {submitted && (
                      <div
                        style={{
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          marginTop: '1rem',
                          backgroundColor: questionCorrect ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${questionCorrect ? '#86efac' : '#fecaca'}`
                        }}
                      >
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong style={{ color: questionCorrect ? '#166534' : '#991b1b' }}>
                            {questionCorrect ? <><span style={{ color: '#16a34a' }}>✓</span> Correct!</> : <><span style={{ color: '#dc2626' }}>✗</span> Incorrect</>}
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                          <strong>Correct answers:</strong> {(question as FillBlankQuestion).correctAnswers.map((ans, idx) => `Blank ${idx + 1}: ${ans}`).join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card.Body>
          </Card>
          );
          })()}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
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
            <div style={{ display: 'flex', gap: '1rem' }}>
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
                className={`mb-4 ${questionCorrect ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"}`}
              >
                <Card.Body>
                  <h3>
                    Question {index + 1} ({question.points} points)
                    <span className={`ml-4 ${questionCorrect ? "text-green-600" : "text-red-600"}`}>
                      {questionCorrect ? <><span style={{ color: '#16a34a', marginLeft: '0.25rem' }}>✓</span> Correct</> : <><span style={{ color: '#dc2626', marginLeft: '0.25rem' }}>✗</span> Incorrect</>}
                    </span>
                  </h3>
                  {question.type !== "fill-blank" && (
                    <div 
                      dangerouslySetInnerHTML={{ __html: question.question }} 
                    />
                  )}

                  {question.type === "multiple-choice" && (
                    <div className="mt-4">
                      {(question as MultipleChoiceQuestion).choices.map((choice: string, i: number) => {
                        const mcq = question as MultipleChoiceQuestion;
                        const correctIndices = getCorrectIndices(mcq);
                        const isCorrectAnswer = correctIndices.includes(i);
                        const answerValue = answers[question._id];
                        const isSelected = Array.isArray(answerValue)
                          ? (answerValue as number[]).includes(i)
                          : answerValue === i;

                        return (
                          <Form.Check
                            key={i}
                            type="checkbox"
                            id={`question-${question._id}-choice-${i}`}
                            label={
                              <span>
                                {choice}
                                {isCorrectAnswer && (
                                  <span className="text-green-600 ml-2">(Correct Answer)</span>
                                )}
                              </span>
                            }
                            checked={isSelected}
                            disabled={true}
                            className="mb-2"
                          />
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
                        {(question as TrueFalseQuestion).correctAnswer === true && (
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
                        {(question as TrueFalseQuestion).correctAnswer === false && (
                          <span className="text-green-600" style={{ marginLeft: '0.5rem' }}>(Correct Answer)</span>
                        )}
                      </div>
                    </div>
                  )}

                  {question.type === "fill-blank" && (() => {
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

                    const { parts, blankCount } = parseFillBlankQuestion(question.question);
                    const answerValue = answers[question._id];
                    const fillBlankAnswers: Record<string, string> = (typeof answerValue === 'object' && answerValue !== null && !Array.isArray(answerValue))
                      ? answerValue as Record<string, string>
                      : {};
                    
                    return (
                      <div className="mt-4" style={{ lineHeight: '2' }}>
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
                        {submitted && (
                          <div
                            style={{
                              padding: '1rem',
                              borderRadius: '0.5rem',
                              marginTop: '1rem',
                              backgroundColor: questionCorrect ? '#f0fdf4' : '#fef2f2',
                              border: `1px solid ${questionCorrect ? '#86efac' : '#fecaca'}`
                            }}
                          >
                            <div style={{ marginBottom: '0.5rem' }}>
                              <strong style={{ color: questionCorrect ? '#166534' : '#991b1b' }}>
                                {questionCorrect ? <><span style={{ color: '#16a34a' }}>✓</span> Correct!</> : <><span style={{ color: '#dc2626' }}>✗</span> Incorrect</>}
                              </strong>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                              <strong>Correct answers:</strong> {(question as FillBlankQuestion).correctAnswers.map((ans, idx) => `Blank ${idx + 1}: ${ans}`).join(", ")}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Card.Body>
              </Card>
            );
          })}

          <Card className="mt-8 text-center bg-gray-100">
            <Card.Body>
              <h2>Preview Results</h2>
              <p className="text-2xl mt-4">
                Score: {score} / {totalPoints}
              </p>
              <p className="text-xl mt-2">
                Percentage: {((score || 0) / totalPoints * 100).toFixed(1)}%
              </p>
              <div className="mt-4" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSubmitted(false);
                    setAnswers({});
                    setScore(null);
                    setCurrentQuestionIndex(0);
                  }}
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


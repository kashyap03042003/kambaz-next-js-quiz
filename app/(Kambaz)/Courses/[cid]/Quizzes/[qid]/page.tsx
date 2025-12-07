"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../store";
import * as client from "../client";
import { Quiz } from "../../../../types";
import { Button, Card } from "react-bootstrap";
import { format } from "date-fns";

export default function QuizDetails() {
  const { cid, qid } = useParams();
  const router = useRouter();
  const { currentUser } = useSelector((state: RootState) => state.accountReducer);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (qid) {
      loadQuiz();
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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  const isFaculty = currentUser?.role === "FACULTY";

  const isQuizAvailable = () => {
    if (isFaculty) return true; // Faculty can always access
    
    if (!quiz.published) return false;
    
    const now = new Date();
    
    if (quiz.availableDate) {
      const availableDate = new Date(quiz.availableDate);
      if (now < availableDate) return false;
    }
    
    if (quiz.dueDate) {
      const dueDate = new Date(quiz.dueDate);
      if (now > dueDate) return false;
    }
    
    return true;
  };

  const quizAvailable = isQuizAvailable();
  const now = new Date();
  const dueDate = quiz.dueDate ? new Date(quiz.dueDate) : null;
  const isPastDueDate = dueDate && now > dueDate;

  return (
    <div id="wd-quiz-details" className="p-[20px]">
      <div className="mb-4">
        <Link href={`/Courses/${cid}/Quizzes`}>← Back to Quizzes</Link>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <h2>{quiz.title}</h2>
          {quiz.description && <p>{quiz.description}</p>}
          <div className="mt-4">
            <p><strong>Quiz Type:</strong> {quiz.quizType.replace("-", " ")}</p>
            <p><strong>Points:</strong> {quiz.points}</p>
            {quiz.timeLimit && quiz.timeLimit > 0 && (
              <p><strong>Time Limit:</strong> {quiz.timeLimit} minutes</p>
            )}
            {quiz.multipleAttempts && (
              <p><strong>Multiple Attempts:</strong> Yes ({quiz.attemptsAllowed || 1} attempts allowed)</p>
            )}
            {quiz.dueDate && (
              <p><strong>Due Date:</strong> {format(new Date(quiz.dueDate), "MMM d, yyyy h:mm a")}</p>
            )}
            {quiz.availableDate && (
              <p><strong>Available Date:</strong> {format(new Date(quiz.availableDate), "MMM d, yyyy h:mm a")}</p>
            )}
            {quiz.availableUntilDate && (
              <p><strong>Available Until:</strong> {format(new Date(quiz.availableUntilDate), "MMM d, yyyy h:mm a")}</p>
            )}
            {!isFaculty && !quizAvailable && (
              <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded">
                <strong className="text-red-800">
                  {isPastDueDate 
                    ? "This quiz is no longer available. The due date has passed."
                    : "This quiz is not yet available."}
                </strong>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {isFaculty ? (
        <div className="flex items-center">
          <Button
            variant={quiz.published ? "secondary" : "success"}
            onClick={async () => {
              try {
                await client.publishQuiz(quiz._id, !quiz.published);
                loadQuiz();
              } catch (error) {
                console.error("Failed to update quiz", error);
              }
            }}
            className="me-4"
          >
            {quiz.published ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push(`/Courses/${cid}/Quizzes/${quiz._id}/edit`)}
            className="me-4"
          >
            Edit
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => router.push(`/Courses/${cid}/Quizzes/${quiz._id}/preview`)}
          >
            Preview
          </Button>
        </div>
      ) : (
        <Button
          variant="primary"
          onClick={() => router.push(`/Courses/${cid}/Quizzes/${quiz._id}/take`)}
          disabled={!quizAvailable}
        >
          Start Quiz
        </Button>
      )}
    </div>
  );
}


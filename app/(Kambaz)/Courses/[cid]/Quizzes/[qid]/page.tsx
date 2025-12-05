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

  return (
    <div id="wd-quiz-details" style={{ padding: "20px" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href={`/Courses/${cid}/Quizzes`}>← Back to Quizzes</Link>
      </div>

      <Card style={{ marginBottom: "1rem" }}>
        <Card.Body>
          <h2>{quiz.title}</h2>
          {quiz.description && <p>{quiz.description}</p>}
          <div style={{ marginTop: "1rem" }}>
            <p><strong>Quiz Type:</strong> {quiz.quizType.replace("-", " ")}</p>
            <p><strong>Points:</strong> {quiz.points}</p>
            <p><strong>Time Limit:</strong> {quiz.timeLimit} minutes</p>
            {quiz.dueDate && (
              <p><strong>Due Date:</strong> {format(new Date(quiz.dueDate), "MMM d, yyyy h:mm a")}</p>
            )}
            {quiz.availableDate && (
              <p><strong>Available Date:</strong> {format(new Date(quiz.availableDate), "MMM d, yyyy h:mm a")}</p>
            )}
          </div>
        </Card.Body>
      </Card>

      {isFaculty ? (
        <div style={{ display: "flex", gap: "1rem" }}>
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
          >
            {quiz.published ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push(`/Courses/${cid}/Quizzes/${quiz._id}/edit`)}
          >
            Edit Quiz
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
        >
          Start Quiz
        </Button>
      )}
    </div>
  );
}


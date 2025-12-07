"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../store";
import * as client from "./client";
import { Quiz } from "../../../types";
import { Button, Card, Badge, Dropdown } from "react-bootstrap";
import { FaPlus, FaEllipsisV } from "react-icons/fa";
import { format } from "date-fns";

export default function Quizzes() {
  const { cid } = useParams();
  const router = useRouter();
  const { currentUser } = useSelector((state: RootState) => state.accountReducer);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cid) {
      loadQuizzes();
    }
  }, [cid]);

  const loadQuizzes = async () => {
    try {
      const data = await client.findQuizzesForCourse(cid as string);
      const sortedQuizzes = data.sort((a: Quiz, b: Quiz) => {
        const dateA = a.availableDate ? new Date(a.availableDate).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.availableDate ? new Date(b.availableDate).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      });
      setQuizzes(sortedQuizzes);
    } catch (error) {
      console.error("Failed to load quizzes", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quizId: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await client.deleteQuiz(quizId);
      loadQuizzes();
    } catch (error) {
      console.error("Failed to delete quiz", error);
    }
  };

  const handlePublish = async (quizId: string, published: boolean) => {
    try {
      await client.publishQuiz(quizId, published);
      loadQuizzes();
    } catch (error) {
      console.error("Failed to update quiz", error);
    }
  };

  const handleCreateQuiz = async () => {
    try {
      const newQuiz = await client.createQuiz(cid as string);
      router.push(`/Courses/${cid}/Quizzes/${newQuiz._id}/edit`);
    } catch (error) {
      console.error("Failed to create quiz", error);
    }
  };

  const getAvailabilityStatus = (quiz: Quiz) => {
    const now = new Date();
    const availableDate = quiz.availableDate ? new Date(quiz.availableDate) : null;
    const availableUntil = quiz.availableUntilDate ? new Date(quiz.availableUntilDate) : null;

    if (availableUntil && now > availableUntil) {
      return "Closed";
    }
    if (availableDate && now < availableDate) {
      return `Not available until ${format(availableDate, "MMM d, yyyy")}`;
    }
    return "Available";
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const isFaculty = currentUser?.role === "FACULTY";

  return (
    <div id="wd-quizzes" className="p-[20px]">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Quizzes</h2>
        {isFaculty && (
          <Button variant="primary" onClick={handleCreateQuiz} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaPlus /> Quiz
          </Button>
        )}
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <Card.Body>
            <p>
              No quizzes available. {isFaculty && 'Click the "+ Quiz" button to create one.'}
            </p>
          </Card.Body>
        </Card>
      ) : (
        <div>
          {quizzes.map((quiz) => (
            <Card key={quiz._id} className="mb-4 relative">
              <Card.Body>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link
                          href={`/Courses/${cid}/Quizzes/${quiz._id}`}
                          className="no-underline text-inherit"
                          style={{ display: 'flex', alignItems: 'center' }}
                        >
                          <h3 className="cursor-pointer m-0">{quiz.title}</h3>
                        </Link>
                        {isFaculty && quiz.published && (
                          <span style={{ color: '#16a34a', fontSize: '1.125rem', display: 'flex', alignItems: 'center' }}>✓</span>
                        )}
                      </div>
                      {isFaculty && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Dropdown>
                            <Dropdown.Toggle
                              variant="link"
                              id={`quiz-menu-${quiz._id}`}
                              className="no-underline text-black"
                              style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <FaEllipsisV />
                            </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => handlePublish(quiz._id, !quiz.published)}>
                          {quiz.published ? "Unpublish" : "Publish"}
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => handleDelete(quiz._id)} className="text-red-600">
                          Delete
                        </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      )}
                    </div>
                    <div className="text-gray-600 text-sm mb-2">
                      <div>Availability: {getAvailabilityStatus(quiz)}</div>
                      {quiz.dueDate && (
                        <div>Due: {format(new Date(quiz.dueDate), "MMM d, yyyy h:mm a")}</div>
                      )}
                      <div>Points: {quiz.points}</div>
                      <div>Questions: {quiz.questionCount || 0}</div>
                      {currentUser?.role === "STUDENT" && quiz.score !== undefined && (
                        <div>
                          Score: {quiz.score} / {quiz.totalPoints}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

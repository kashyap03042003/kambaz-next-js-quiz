"use client";
import React, { useState, useEffect, useRef } from "react";
import { usePathname, useParams } from "next/navigation";
import { FaAlignJustify } from "react-icons/fa6";
import * as quizClient from "./Quizzes/client";

// UUID regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Breadcrumb({
  course,
  onToggle,
}: {
  course?: { name: string };
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { cid } = useParams();
  const [quizTitles, setQuizTitles] = useState<Record<string, string>>({});
  const fetchedRef = useRef<Set<string>>(new Set());

  // Extract everything after /Courses/:cid/
  const pathAfterCourse = pathname.split(`/Courses/${cid}/`)[1] || "";
  const parts = pathAfterCourse ? pathAfterCourse.split("/") : [];

  // Find quiz IDs in the path and fetch their titles
  useEffect(() => {
    const fetchQuizTitles = async () => {
      const quizIds = parts.filter(part => UUID_REGEX.test(part));
      if (quizIds.length === 0) return;

      const titlesToFetch = quizIds.filter(quizId => !fetchedRef.current.has(quizId));
      if (titlesToFetch.length === 0) return;

      const newTitles: Record<string, string> = {};

      await Promise.all(
        titlesToFetch.map(async (quizId) => {
          fetchedRef.current.add(quizId); // Mark as being fetched
          try {
            const quiz = await quizClient.findQuizById(quizId);
            newTitles[quizId] = quiz.title;
          } catch (error) {
            console.error(`Failed to fetch quiz ${quizId}:`, error);
            // Keep the ID if fetch fails
            newTitles[quizId] = quizId;
          }
        })
      );

      if (Object.keys(newTitles).length > 0) {
        setQuizTitles(prev => ({ ...prev, ...newTitles }));
      }
    };

    if (parts.length > 0) {
      fetchQuizTitles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Format path parts for display
  const formatPart = (part: string, index: number) => {
    // Check if it's a UUID (quiz ID)
    if (UUID_REGEX.test(part)) {
      // Return the quiz title if available, otherwise show the ID
      return quizTitles[part] || part;
    }
    // Capitalize first letter for other parts
    return part.charAt(0).toUpperCase() + part.slice(1);
  };

  return (
    <h2 className="text-danger">
      <FaAlignJustify
        className="me-3 fs-4 mb-1"
        role="button"
        aria-label="Toggle course navigation"
        onClick={onToggle}
      />
      {course?.name}
      {parts.map((part, i) => (
        <span key={i}> &gt; {formatPart(part, i)}</span>
      ))}
    </h2>
  );
}
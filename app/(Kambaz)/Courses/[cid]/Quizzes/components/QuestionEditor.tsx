"use client";
import { useState, useEffect } from "react";
import { Question, MultipleChoiceQuestion, TrueFalseQuestion, FillBlankQuestion } from "../../../../types";
import RichTextEditor from "./RichTextEditor";
import { Button, Form, Card } from "react-bootstrap";
import "./QuestionEditor.css";

interface QuestionEditorProps {
  question: Question;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

export default function QuestionEditor({ question, onSave, onCancel }: QuestionEditorProps) {
  const [type, setType] = useState<Question["type"]>(question.type);
  const [title, setTitle] = useState(question.title);
  const [points, setPoints] = useState(question.points);
  const [questionText, setQuestionText] = useState(question.question);

  // Multiple choice state
  const [choices, setChoices] = useState<string[]>(
    question.type === "multiple-choice" ? (question as MultipleChoiceQuestion).choices : ["", ""]
  );
  // Support both single (backward compatibility) and multiple correct answers
  const getInitialCorrectIndices = () => {
    if (question.type === "multiple-choice") {
      const mcq = question as MultipleChoiceQuestion;
      if (mcq.correctChoiceIndices && mcq.correctChoiceIndices.length > 0) {
        return mcq.correctChoiceIndices;
      } else if (mcq.correctChoiceIndex !== undefined) {
        return [mcq.correctChoiceIndex];
      }
    }
    return [];
  };
  const [correctChoiceIndices, setCorrectChoiceIndices] = useState<number[]>(getInitialCorrectIndices());

  // True/false state
  const [correctAnswer, setCorrectAnswer] = useState(
    question.type === "true-false" ? (question as TrueFalseQuestion).correctAnswer : true
  );

  // Fill blank state
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(
    question.type === "fill-blank" ? (question as FillBlankQuestion).correctAnswers : [""]
  );

  useEffect(() => {
    // Reset state when type changes
    if (type === "multiple-choice" && question.type !== "multiple-choice") {
      setChoices(["", ""]);
      setCorrectChoiceIndices([]);
    } else if (type === "true-false" && question.type !== "true-false") {
      setCorrectAnswer(true);
    } else if (type === "fill-blank" && question.type !== "fill-blank") {
      setCorrectAnswers([""]);
    }
  }, [type, question.type]);

  // Ensure multiple choice questions always have at least 2 choices
  useEffect(() => {
    if (type === "multiple-choice" && choices.length < 2) {
      const newChoices = [...choices];
      while (newChoices.length < 2) {
        newChoices.push("");
      }
      setChoices(newChoices);
    }
  }, [type, choices.length]);

  const handleSave = () => {
    // Validation
    if (!title.trim()) {
      alert("Please enter a question title");
      return;
    }
    if (!questionText.trim()) {
      alert("Please enter question text");
      return;
    }
    if (points < 1) {
      alert("Points must be at least 1");
      return;
    }

    let updatedQuestion: Question;

    if (type === "multiple-choice") {
      // Filter out empty choices and validate
      const validChoices = choices.filter((c) => c.trim() !== "");
      if (validChoices.length < 2) {
        alert("Please provide at least 2 choices for multiple choice questions");
        return;
      }
      // Validate at least one correct answer is selected
      if (correctChoiceIndices.length === 0) {
        alert("Please select at least one correct answer");
        return;
      }
      // Ensure all correct indices are valid
      const validIndices = correctChoiceIndices
        .filter((idx) => idx >= 0 && idx < validChoices.length)
        .sort((a, b) => a - b);
      if (validIndices.length === 0) {
        alert("Please select at least one valid correct answer");
        return;
      }
      updatedQuestion = {
        _id: question._id,
        quizId: question.quizId,
        type: "multiple-choice",
        title: title.trim(),
        points,
        question: questionText.trim(),
        choices: validChoices,
        correctChoiceIndices: validIndices,
      } as MultipleChoiceQuestion;
    } else if (type === "true-false") {
      updatedQuestion = {
        _id: question._id,
        quizId: question.quizId,
        type: "true-false",
        title: title.trim(),
        points,
        question: questionText.trim(),
        correctAnswer,
      } as TrueFalseQuestion;
    } else {
      const validAnswers = correctAnswers.filter((a) => a.trim() !== "");
      if (validAnswers.length === 0) {
        alert("Please provide at least one correct answer");
        return;
      }
      updatedQuestion = {
        _id: question._id,
        quizId: question.quizId,
        type: "fill-blank",
        title: title.trim(),
        points,
        question: questionText.trim(),
        correctAnswers: validAnswers,
      } as FillBlankQuestion;
    }

    onSave(updatedQuestion);
  };

  const addChoice = () => {
    setChoices([...choices, ""]);
  };

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      const newChoices = choices.filter((_, i) => i !== index);
      setChoices(newChoices);
      // Remove the index from correct answers if it was selected, and adjust other indices
      const newCorrectIndices = correctChoiceIndices
        .filter((idx) => idx !== index)
        .map((idx) => (idx > index ? idx - 1 : idx));
      setCorrectChoiceIndices(newCorrectIndices);
    }
  };

  const toggleCorrectChoice = (index: number) => {
    if (correctChoiceIndices.includes(index)) {
      // Remove from correct answers
      setCorrectChoiceIndices(correctChoiceIndices.filter((idx) => idx !== index));
    } else {
      // Add to correct answers
      setCorrectChoiceIndices([...correctChoiceIndices, index].sort((a, b) => a - b));
    }
  };

  const updateChoice = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const addCorrectAnswer = () => {
    setCorrectAnswers([...correctAnswers, ""]);
  };

  const removeCorrectAnswer = (index: number) => {
    if (correctAnswers.length > 1) {
      setCorrectAnswers(correctAnswers.filter((_, i) => i !== index));
    }
  };

  const updateCorrectAnswer = (index: number, value: string) => {
    const newAnswers = [...correctAnswers];
    newAnswers[index] = value;
    setCorrectAnswers(newAnswers);
  };

  return (
    <Card className="question-editor">
      <Card.Header className="question-editor-header">
        <h3>{question._id && question._id !== "" ? "Edit Question" : "New Question"}</h3>
      </Card.Header>
      <Card.Body className="question-editor-body">
        <Form.Group className="mb-3">
          <Form.Label>Question Type</Form.Label>
          <Form.Select
            value={type}
            onChange={(e) => setType(e.target.value as Question["type"])}
          >
            <option value="multiple-choice">Multiple Choice</option>
            <option value="true-false">True/False</option>
            <option value="fill-blank">Fill in the Blank</option>
          </Form.Select>
        </Form.Group>

        <div className="form-row">
          <Form.Group className="mb-3">
            <Form.Label>Title *</Form.Label>
            <Form.Control
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter question title"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Points *</Form.Label>
            <Form.Control
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
              min="1"
              placeholder="1"
            />
          </Form.Group>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Question Text *</Form.Label>
          <RichTextEditor value={questionText} onChange={setQuestionText} />
          {type === "fill-blank" && (
            <Form.Text className="text-muted" style={{ display: "block", marginTop: "0.5rem" }}>
              Tip: Use underscores (___) or brackets [___] to indicate where students should fill in the blank.
            </Form.Text>
          )}
        </Form.Group>

        {type === "multiple-choice" && (
          <div className="form-group choices-group">
            <Form.Label>Choices * (Select all correct answers)</Form.Label>
            <div className="choices-list">
              {choices.map((choice, index) => (
                <div key={index} className="choice-item">
                  <div className="choice-checkbox">
                    <Form.Check
                      type="checkbox"
                      checked={correctChoiceIndices.includes(index)}
                      onChange={() => toggleCorrectChoice(index)}
                      id={`choice-${index}`}
                      label="Correct"
                    />
                  </div>
                  <Form.Control
                    type="text"
                    value={choice}
                    onChange={(e) => updateChoice(index, e.target.value)}
                    placeholder={`Choice ${index + 1}`}
                    className="choice-input"
                  />
                  {choices.length > 2 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeChoice(index)}
                      title="Remove choice"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={addChoice} className="btn-add">
              + Add Choice
            </Button>
            <p className="form-hint">
              At least 2 choices required. Select the checkbox(es) next to the correct answer(s). You can select multiple correct answers.
            </p>
          </div>
        )}

        {type === "true-false" && (
          <Form.Group className="mb-3">
            <Form.Label>Correct Answer *</Form.Label>
            <div className="radio-group">
              <Form.Check
                type="radio"
                name="true-false"
                checked={correctAnswer === true}
                onChange={() => setCorrectAnswer(true)}
                label="True"
                id="true-option"
              />
              <Form.Check
                type="radio"
                name="true-false"
                checked={correctAnswer === false}
                onChange={() => setCorrectAnswer(false)}
                label="False"
                id="false-option"
              />
            </div>
          </Form.Group>
        )}

        {type === "fill-blank" && (
          <Form.Group className="mb-3">
            <Form.Label>Correct Answers * (case-insensitive)</Form.Label>
            <div className="answers-list">
              {correctAnswers.map((answer, index) => (
                <div key={index} className="answer-item">
                  <Form.Control
                    type="text"
                    value={answer}
                    onChange={(e) => updateCorrectAnswer(index, e.target.value)}
                    placeholder={`Correct answer ${index + 1}`}
                    className="answer-input"
                  />
                  {correctAnswers.length > 1 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeCorrectAnswer(index)}
                      title="Remove answer"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={addCorrectAnswer} className="btn-add">
              + Add Answer
            </Button>
            <p className="form-hint">Add multiple acceptable answers if needed.</p>
          </Form.Group>
        )}

        <div className="question-editor-actions">
          <Button variant="primary" onClick={handleSave}>
            {question._id && question._id !== "" ? "Update Question" : "Save Question"}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}


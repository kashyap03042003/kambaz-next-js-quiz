"use client";
import { useState, useEffect } from "react";
import { Question, MultipleChoiceQuestion, TrueFalseQuestion, FillBlankQuestion } from "../../../../types";
import RichTextEditor from "./RichTextEditor";
import { Button, Form, Card } from "react-bootstrap";

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
  const [group, setGroup] = useState(question.group || "");

  const [choices, setChoices] = useState<string[]>(
    question.type === "multiple-choice" ? (question as MultipleChoiceQuestion).choices : ["", ""]
  );
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

  const [correctAnswer, setCorrectAnswer] = useState(
    question.type === "true-false" ? (question as TrueFalseQuestion).correctAnswer : true
  );

  const [correctAnswers, setCorrectAnswers] = useState<string[]>(
    question.type === "fill-blank" ? (question as FillBlankQuestion).correctAnswers : [""]
  );

  useEffect(() => {
    if (type === "multiple-choice" && question.type !== "multiple-choice") {
      setChoices(["", ""]);
      setCorrectChoiceIndices([]);
    } else if (type === "true-false" && question.type !== "true-false") {
      setCorrectAnswer(true);
    } else if (type === "fill-blank" && question.type !== "fill-blank") {
      setCorrectAnswers([""]);
    }
  }, [type, question.type]);

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
      const validChoices = choices.filter((c) => c.trim() !== "");
      if (validChoices.length < 2) {
        alert("Please provide at least 2 choices for multiple choice questions");
        return;
      }
      if (correctChoiceIndices.length === 0) {
        alert("Please select at least one correct answer");
        return;
      }
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
        group: group.trim() || undefined,
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
        group: group.trim() || undefined,
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
        group: group.trim() || undefined,
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
      const newCorrectIndices = correctChoiceIndices
        .filter((idx) => idx !== index)
        .map((idx) => (idx > index ? idx - 1 : idx));
      setCorrectChoiceIndices(newCorrectIndices);
    }
  };

  const toggleCorrectChoice = (index: number) => {
    if (correctChoiceIndices.includes(index)) {
      setCorrectChoiceIndices(correctChoiceIndices.filter((idx) => idx !== index));
    } else {
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
    <Card className="bg-white rounded-lg overflow-hidden mb-8">
      <Card.Header className="bg-gray-100 px-6 py-4 border-b border-gray-200">
        <h3 className="m-0 text-xl text-gray-800">{question._id && question._id !== "" ? "Edit Question" : "New Question"}</h3>
      </Card.Header>
      <Card.Body className="p-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Form.Label>Question Group (optional)</Form.Label>
          <Form.Control
            type="text"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="Enter group name (e.g., 'Chapter 1', 'Midterm', etc.)"
          />
          <Form.Text className="text-muted">
            Group questions together for easier organization and filtering
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Question Text *</Form.Label>
          <RichTextEditor value={questionText} onChange={setQuestionText} />
          {type === "fill-blank" && (
            <div className="mt-2 p-4 bg-gray-100 rounded">
              <Form.Text className="text-muted block mb-3">
                <strong>How to add blanks:</strong> Type <code>___</code> or <code>[___]</code> in your question text where you want students to fill in the blank.
                Each blank will be automatically numbered (1, 2, 3, etc.) and students will see numbered input boxes for each blank.
              </Form.Text>
              <div className="flex gap-2 flex-wrap mb-3">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setQuestionText(questionText + ' ___');
                  }}
                >
                  + Add Blank (___)
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setQuestionText(questionText + ' [___]');
                  }}
                >
                  + Add Blank ([___])
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                <strong>Example:</strong> &quot;The capital of France is ___ and the capital of Germany is ___.&quot;
                <br />
                This creates two numbered input boxes: (1) and (2) for students to fill in.
              </div>
            </div>
          )}
        </Form.Group>

        {type === "multiple-choice" && (
          <div className="bg-gray-100 p-6 rounded-lg border border-gray-200 mb-4">
            <Form.Label>Choices * (Select all correct answers)</Form.Label>
            <div className="mb-4">
              {choices.map((choice, index) => (
                <div 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    marginBottom: '0.75rem', 
                    alignItems: 'center',
                    backgroundColor: 'white',
                    padding: '0.75rem',
                    borderRadius: '0.25rem',
                    border: '1px solid #d1d5db'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '100px' }}>
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
                    style={{ flex: 1, margin: 0 }}
                  />
                  {choices.length > 2 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeChoice(index)}
                      title="Remove choice"
                      style={{ flexShrink: 0 }}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={addChoice} className="mt-2">
              + Add Choice
            </Button>
            <p className="mt-2 text-sm text-gray-600 italic">
              At least 2 choices required. Select the checkbox(es) next to the correct answer(s). You can select multiple correct answers.
            </p>
          </div>
        )}

        {type === "true-false" && (
          <Form.Group className="mb-3">
            <Form.Label>Correct Answer *</Form.Label>
            <div className="flex gap-8 p-4 bg-gray-100 rounded-lg">
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
            <div className="mb-4">
              {correctAnswers.map((answer, index) => (
                <div 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    marginBottom: '0.75rem', 
                    alignItems: 'center' 
                  }}
                >
                  <Form.Control
                    type="text"
                    value={answer}
                    onChange={(e) => updateCorrectAnswer(index, e.target.value)}
                    placeholder={`Correct answer ${index + 1}`}
                    style={{ flex: 1, margin: 0 }}
                  />
                  {correctAnswers.length > 1 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeCorrectAnswer(index)}
                      title="Remove answer"
                      style={{ flexShrink: 0 }}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={addCorrectAnswer} className="mt-2">
              + Add Answer
            </Button>
            <p className="mt-2 text-sm text-gray-600 italic">Add multiple acceptable answers if needed.</p>
          </Form.Group>
        )}

        <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
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


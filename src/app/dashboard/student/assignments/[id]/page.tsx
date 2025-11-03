"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function StudentAssignmentPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, []);

  const fetchAssignment = async () => {
    try {
      const response = await fetch(`/api/assignments/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setAssignment(data.assignment);
        setSubmission(data.submission);
        // Load existing answers
        if (data.submission?.answers) {
          setAnswers(
            typeof data.submission.answers === "string"
              ? JSON.parse(data.submission.answers)
              : data.submission.answers
          );
        }
      }
    } catch (error) {
      console.error("Error fetching assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/assignments/${params.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (response.ok) {
        alert("Assignment submitted successfully!");
        fetchAssignment();
      } else {
        alert("Failed to submit assignment");
      }
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Error submitting assignment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Assignment not found
      </div>
    );
  }

  const isPastDue = new Date(assignment.due_date) < new Date();
  const isSubmitted = submission?.status === "submitted" || submission?.status === "graded";

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/dashboard/student/assignments">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{assignment.title}</h1>
              <p className="text-muted-foreground">
                {assignment.assignment_classes?.[0]?.classes?.name || "Assignment"}
              </p>
            </div>
            {isSubmitted && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3 inline mr-1" />
                Submitted
              </span>
            )}
          </div>

          {assignment.description && (
            <p className="text-sm mb-4">{assignment.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Due: {new Date(assignment.due_date).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Points: {assignment.total_points}</span>
            </div>
          </div>

          {isPastDue && !isSubmitted && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-red-700 dark:text-red-300 text-sm">
              This assignment is past due
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
          <h2 className="text-xl font-bold mb-4">Questions</h2>

          {submission?.status === "graded" ? (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg mb-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Grade: {submission.score} / {assignment.total_points}
              </p>
              {submission.teacher_feedback && (
                <p className="text-sm mt-2">{submission.teacher_feedback}</p>
              )}
            </div>
          ) : isSubmitted ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your submission is being reviewed by your teacher.
              </p>
            </div>
          ) : null}

          {/* Display Questions */}
          {assignment.assignment_questions &&
            assignment.assignment_questions.length > 0 ? (
            <div className="space-y-6">
              {assignment.assignment_questions
                .sort((a: any, b: any) => a.question_number - b.question_number)
                .map((question: any, index: number) => (
                  <div key={question.id} className="border-b pb-6 last:border-b-0">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="font-bold text-lg">{index + 1}.</span>
                      <div className="flex-1">
                        <p className="font-medium mb-2">{question.question_text}</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          {question.points} points • {question.question_type.replace("_", " ")}
                        </p>

                        {/* MCQ */}
                        {question.question_type === "mcq" && question.options && (
                          <div className="space-y-2">
                            {JSON.parse(question.options).map((option: string, i: number) => (
                              <label key={i} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted">
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  value={option}
                                  checked={answers[question.id] === option}
                                  onChange={(e) =>
                                    setAnswers({ ...answers, [question.id]: e.target.value })
                                  }
                                  disabled={isSubmitted || isPastDue}
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* True/False */}
                        {question.question_type === "true_false" && (
                          <div className="space-y-2">
                            {["True", "False"].map((option) => (
                              <label key={option} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted">
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  value={option}
                                  checked={answers[question.id] === option}
                                  onChange={(e) =>
                                    setAnswers({ ...answers, [question.id]: e.target.value })
                                  }
                                  disabled={isSubmitted || isPastDue}
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Short Answer */}
                        {question.question_type === "short_answer" && (
                          <Input
                            value={answers[question.id] || ""}
                            onChange={(e) =>
                              setAnswers({ ...answers, [question.id]: e.target.value })
                            }
                            placeholder="Your answer"
                            disabled={isSubmitted || isPastDue}
                          />
                        )}

                        {/* Long Answer */}
                        {question.question_type === "long_answer" && (
                          <Textarea
                            value={answers[question.id] || ""}
                            onChange={(e) =>
                              setAnswers({ ...answers, [question.id]: e.target.value })
                            }
                            placeholder="Your answer"
                            rows={5}
                            disabled={isSubmitted || isPastDue}
                          />
                        )}

                        {/* Show explanation if graded */}
                        {submission?.status === "graded" && question.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded text-sm">
                            <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                              Explanation:
                            </p>
                            <p>{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

              {!isSubmitted && !isPastDue && (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full mt-6"
                  size="lg"
                >
                  {submitting ? "Submitting..." : "Submit Assignment"}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No questions available
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
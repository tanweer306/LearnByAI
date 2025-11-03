"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle, Save } from "lucide-react";
import Link from "next/link";

export default function GradingInterface({ submission, assignmentId }: any) {
  const router = useRouter();
  const [grades, setGrades] = useState<Record<string, { points: number; feedback: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState(submission.teacher_feedback || "");
  const [saving, setSaving] = useState(false);

  const answers = JSON.parse(submission.answers || "{}");
  const questions = submission.assignment.assignment_questions || [];

  const handleAutoGrade = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/assignments/${submission.id}/auto-grade`, {
        method: "POST",
      });

      if (response.ok) {
        alert("Auto-grading complete!");
        router.refresh();
      } else {
        alert("Failed to auto-grade");
      }
    } catch (error) {
      console.error("Error auto-grading:", error);
      alert("Error auto-grading");
    } finally {
      setSaving(false);
    }
  };

  const handleManualGrade = async () => {
    setSaving(true);
    try {
      const totalScore = Object.values(grades).reduce((sum, g) => sum + g.points, 0);

      const response = await fetch(`/api/assignments/${submission.id}/manual-grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grades,
          overallFeedback,
          totalScore,
        }),
      });

      if (response.ok) {
        alert("Grading saved successfully!");
        router.push(`/dashboard/teacher/assignments/${assignmentId}`);
      } else {
        alert("Failed to save grades");
      }
    } catch (error) {
      console.error("Error saving grades:", error);
      alert("Error saving grades");
    } finally {
      setSaving(false);
    }
  };

  const totalScore = Object.values(grades).reduce((sum, g) => sum + g.points, 0);
  const totalPossible = submission.assignment.total_points;

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href={`/dashboard/teacher/assignments/${assignmentId}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assignment
        </Button>
      </Link>

      {/* Student Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {submission.student.first_name} {submission.student.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">{submission.student.email}</p>
            <p className="text-sm mt-2">
              Submitted: {new Date(submission.submitted_at).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">
              {totalScore} / {totalPossible}
            </p>
            <p className="text-sm text-muted-foreground">Current Score</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={handleAutoGrade} variant="outline" disabled={saving}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Auto-Grade Objective Questions
          </Button>
        </div>
      </div>

      {/* Questions and Answers */}
      <div className="space-y-6">
        {questions
          .sort((a: any, b: any) => a.question_number - b.question_number)
          .map((question: any, index: number) => {
            const studentAnswer = answers[question.id];
            const isObjective = ['mcq', 'true_false'].includes(question.question_type);
            const isCorrect = isObjective && studentAnswer === question.correct_answer;

            return (
              <div key={question.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg">
                      Question {index + 1} ({question.points} points)
                    </h3>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {question.question_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm mb-3">{question.question_text}</p>

                  {/* Show options for MCQ */}
                  {question.question_type === 'mcq' && question.options && (
                    <div className="mb-3 p-3 bg-muted rounded">
                      <p className="text-xs font-medium mb-2">Options:</p>
                      {JSON.parse(question.options).map((opt: string, i: number) => (
                        <p key={i} className="text-sm">
                          {i + 1}. {opt}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Student Answer */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded mb-3">
                    <p className="text-xs font-medium text-blue-700 mb-1">Student Answer:</p>
                    <p className="text-sm">{studentAnswer || "No answer provided"}</p>
                  </div>

                  {/* Correct Answer for objective questions */}
                  {isObjective && (
                    <div className={`p-3 rounded mb-3 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className={`text-xs font-medium mb-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        Correct Answer:
                      </p>
                      <p className="text-sm">{question.correct_answer}</p>
                      {isCorrect && (
                        <p className="text-xs text-green-600 mt-1">✓ Correct</p>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded mb-3">
                      <p className="text-xs font-medium mb-1">Explanation:</p>
                      <p className="text-sm">{question.explanation}</p>
                    </div>
                  )}
                </div>

                {/* Grading Section */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Points Earned (Max: {question.points})
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={question.points}
                        value={grades[question.id]?.points || 0}
                        onChange={(e) =>
                          setGrades({
                            ...grades,
                            [question.id]: {
                              ...grades[question.id],
                              points: Math.min(question.points, Math.max(0, parseFloat(e.target.value) || 0)),
                            },
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Feedback</label>
                      <Input
                        value={grades[question.id]?.feedback || ""}
                        onChange={(e) =>
                          setGrades({
                            ...grades,
                            [question.id]: {
                              ...grades[question.id],
                              feedback: e.target.value,
                            },
                          })
                        }
                        placeholder="Optional feedback"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Overall Feedback */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6 mt-6">
        <label className="text-sm font-medium mb-2 block">Overall Feedback</label>
        <Textarea
          value={overallFeedback}
          onChange={(e) => setOverallFeedback(e.target.value)}
          placeholder="Provide overall feedback to the student..."
          rows={4}
        />
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end gap-2">
        <Link href={`/dashboard/teacher/assignments/${assignmentId}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleManualGrade} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Grades"}
        </Button>
      </div>
    </main>
  );
}
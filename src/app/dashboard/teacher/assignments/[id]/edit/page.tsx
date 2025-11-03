"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'long_answer';

interface Question {
  id: string;
  questionType: QuestionType;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
  questionNumber: number;
}

export default function EditAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignment, setAssignment] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/details`);
      const data = await response.json();
      
      if (data.success) {
        setAssignment(data.assignment);
        
        // Convert assignment_questions to Question format
        const formattedQuestions = data.assignment.assignment_questions?.map((q: any) => ({
          id: q.id,
          questionType: q.question_type,
          questionText: q.question_text,
          options: q.options ? JSON.parse(q.options) : undefined,
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
          points: q.points,
          questionNumber: q.question_number,
        })) || [];
        
        setQuestions(formattedQuestions);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `new-${Date.now()}`,
      questionType: 'mcq',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 10,
      questionNumber: questions.length + 1,
    };
    setEditingQuestion(newQuestion);
    setShowQuestionBuilder(true);
  };

  const saveQuestion = () => {
    if (!editingQuestion || !editingQuestion.questionText.trim()) {
      alert('Question text is required');
      return;
    }

    const existingIndex = questions.findIndex(q => q.id === editingQuestion.id);
    if (existingIndex >= 0) {
      const updated = [...questions];
      updated[existingIndex] = editingQuestion;
      setQuestions(updated);
    } else {
      setQuestions([...questions, editingQuestion]);
    }

    setEditingQuestion(null);
    setShowQuestionBuilder(false);
  };

  const editQuestion = (question: Question) => {
    setEditingQuestion(question);
    setShowQuestionBuilder(true);
  };

  const deleteQuestion = (id: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questions.map((q, index) => ({
            id: q.id.startsWith('new-') ? undefined : q.id,
            questionType: q.questionType,
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            points: q.points,
            questionNumber: index + 1,
          })),
        }),
      });

      if (response.ok) {
        alert('Assignment updated successfully!');
        router.push(`/dashboard/teacher/assignments/${assignmentId}`);
      } else {
        alert('Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Error updating assignment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href={`/dashboard/teacher/assignments/${assignmentId}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignment
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Assignment</h1>
          <p className="text-muted-foreground">{assignment?.title}</p>
        </div>

        {/* Questions List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Questions ({questions.length})</h2>
            <Button onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No questions added yet</p>
              <p className="text-sm mt-2">Click "Add Question" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions
                .sort((a, b) => a.questionNumber - b.questionNumber)
                .map((q, index) => (
                  <div key={q.id} className="flex items-center gap-3 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Q{index + 1}</span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {q.questionType.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">{q.points} pts</span>
                      </div>
                      <p className="text-sm line-clamp-1">{q.questionText || 'Untitled question'}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => editQuestion(q)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded text-sm">
            <p className="font-medium">Total Points: {questions.reduce((sum, q) => sum + q.points, 0)}</p>
          </div>
        </div>

        {/* Question Builder Modal */}
        {showQuestionBuilder && editingQuestion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-bold mb-4">Question Builder</h3>

              <div className="space-y-4">
                <div>
                  <Label>Question Type</Label>
                  <select
                    value={editingQuestion.questionType}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, questionType: e.target.value as QuestionType })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="mcq">Multiple Choice (Single)</option>
                    <option value="true_false">True/False</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="long_answer">Long Answer</option>
                  </select>
                </div>

                <div>
                  <Label>Question Text *</Label>
                  <Textarea
                    value={editingQuestion.questionText}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                    placeholder="Enter your question"
                    rows={3}
                  />
                </div>

                {editingQuestion.questionType === 'mcq' && (
                  <div>
                    <Label>Options</Label>
                    {editingQuestion.options?.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...(editingQuestion.options || [])];
                            newOpts[i] = e.target.value;
                            setEditingQuestion({ ...editingQuestion, options: newOpts });
                          }}
                          placeholder={`Option ${i + 1}`}
                        />
                        <input
                          type="radio"
                          name="correct"
                          checked={editingQuestion.correctAnswer === opt}
                          onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswer: opt })}
                        />
                        <span className="text-xs">Correct</span>
                      </div>
                    ))}
                  </div>
                )}

                {editingQuestion.questionType === 'true_false' && (
                  <div>
                    <Label>Correct Answer</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={editingQuestion.correctAnswer === 'True'}
                          onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswer: 'True' })}
                        />
                        <span>True</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={editingQuestion.correctAnswer === 'False'}
                          onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswer: 'False' })}
                        />
                        <span>False</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Explanation (Optional)</Label>
                  <Textarea
                    value={editingQuestion.explanation || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                    placeholder="Explain the correct answer"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Points</Label>
                  <Input
                    type="number"
                    value={editingQuestion.points}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, points: parseInt(e.target.value) || 10 })}
                    min="1"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setEditingQuestion(null); setShowQuestionBuilder(false); }}>
                    Cancel
                  </Button>
                  <Button onClick={saveQuestion}>Save Question</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Link href={`/dashboard/teacher/assignments/${assignmentId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </main>
    </div>
  );
}
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'long_answer' | 'matching' | 'ordering' | 'code';

interface Question {
  id: string;
  questionType: QuestionType;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
}

interface AssignmentCreatorProps {
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  classes: any[];
}

export default function AssignmentCreator({ onSave, onCancel, classes }: AssignmentCreatorProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    difficulty: "medium",
    dueDate: "",
    timeLimit: null as number | null,
    lateSubmissionAllowed: true,
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('medium');

  const addQuestion = () => {
    const newQ: Question = {
      id: Date.now().toString(),
      questionType: 'mcq',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 10,
    };
    setEditingQuestion(newQ);
  };

  const generateAIQuestions = async () => {
    if (!aiPrompt.trim()) {
      alert('Please provide content or topic for AI generation');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('/api/assignments/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterContent: aiPrompt,
          difficulty: aiDifficulty,
          questionCount: aiQuestionCount,
          questionTypes: ['mcq', 'true_false', 'short_answer'],
        }),
      });

      const data = await response.json();
      if (data.success) {
        const newQuestions = data.questions.map((q: any) => ({
          id: Date.now().toString() + Math.random(),
          questionType: q.questionType,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points || 10,
        }));
        setQuestions([...questions, ...newQuestions]);
        setShowAIGenerator(false);
        alert(`${newQuestions.length} questions generated!`);
      } else {
        alert('Failed to generate questions');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Error generating questions');
    } finally {
      setAiGenerating(false);
    }
  };

  const saveQuestion = () => {
    if (!editingQuestion || !editingQuestion.questionText.trim()) return;
    
    const existing = questions.findIndex(q => q.id === editingQuestion.id);
    if (existing >= 0) {
      const updated = [...questions];
      updated[existing] = editingQuestion;
      setQuestions(updated);
    } else {
      setQuestions([...questions, editingQuestion]);
    }
    setEditingQuestion(null);
  };

  const handleSave = async (status: 'draft' | 'published') => {
    await onSave({
      ...formData,
      questions,
      classIds: status === 'published' ? selectedClasses : [],
      status,
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step >= s ? 'bg-primary text-white' : 'bg-gray-200'
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`w-20 h-1 ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-2xl font-bold">Assignment Details</h2>
          
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Assignment title"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Date *</Label>
              <Input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Difficulty</Label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Questions */}
      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Questions ({questions.length})</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAIGenerator(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
              <Button onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>

          {questions.map((q, i) => (
            <div key={q.id} className="border p-4 rounded-lg mb-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">Q{i + 1}: {q.questionText || 'Untitled'}</p>
                  <p className="text-sm text-muted-foreground">{q.questionType} - {q.points} pts</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setQuestions(questions.filter(qu => qu.id !== q.id))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Question Builder */}
          {editingQuestion && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-bold mb-3">Question Builder</h3>
              
              <div className="space-y-3">
                <div>
                  <Label>Type</Label>
                  <select
                    value={editingQuestion.questionType}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, questionType: e.target.value as QuestionType })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="mcq">Multiple Choice</option>
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
                    rows={2}
                  />
                </div>

                {editingQuestion.questionType === 'mcq' && (
                  <div>
                    <Label>Options</Label>
                    {editingQuestion.options?.map((opt, i) => (
                      <Input
                        key={i}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(editingQuestion.options || [])];
                          newOpts[i] = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="mb-2"
                      />
                    ))}
                  </div>
                )}

                <div>
                  <Label>Points</Label>
                  <Input
                    type="number"
                    value={editingQuestion.points}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, points: parseInt(e.target.value) })}
                  />
                </div>

                <Button onClick={saveQuestion}>Save Question</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Generator Modal */}
      {showAIGenerator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4">AI Question Generator</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Content or Topic</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Paste chapter content or describe the topic you want questions about..."
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Number of Questions</Label>
                  <Input
                    type="number"
                    value={aiQuestionCount}
                    onChange={(e) => setAiQuestionCount(parseInt(e.target.value) || 5)}
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded text-sm">
                <p className="text-blue-700 dark:text-blue-300">
                  💡 AI will generate a mix of MCQ, True/False, and Short Answer questions based on your content.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAIGenerator(false)} disabled={aiGenerating}>
                  Cancel
                </Button>
                <Button onClick={generateAIQuestions} disabled={aiGenerating}>
                  {aiGenerating ? 'Generating...' : 'Generate Questions'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Assign */}
      {step === 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">Assign to Classes</h2>
          
          <div className="space-y-2">
            {classes.map((cls) => (
              <label key={cls.id} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                <input
                  type="checkbox"
                  checked={selectedClasses.includes(cls.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedClasses([...selectedClasses, cls.id]);
                    } else {
                      setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                    }
                  }}
                />
                <span>{cls.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <div>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave('draft')}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => handleSave('published')}>
              Publish Assignment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
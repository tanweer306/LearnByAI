"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Zap,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AIPrompt {
  id: string;
  name: string;
  prompt_text: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AIPromptsManagementCRUD() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setcategoryFilter] = useState<string>("all");
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    prompt_text: "",
    category: "general",
    is_active: true,
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch("/api/admin/ai-prompts");
      if (response.ok) {
        const data = await response.json();
        setPrompts(data.prompts || []);
      }
    } catch (error) {
      console.error("Error fetching AI prompts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode("create");
    setFormData({
      name: "",
      prompt_text: "",
      category: "general",
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (prompt: AIPrompt) => {
    setModalMode("edit");
    setSelectedPrompt(prompt);
    setFormData({
      name: prompt.name,
      prompt_text: prompt.prompt_text,
      category: prompt.category,
      is_active: prompt.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (promptId: string) => {
    if (!confirm("Are you sure you want to delete this AI prompt?")) return;

    try {
      const response = await fetch(`/api/admin/ai-prompts?id=${promptId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("AI prompt deleted successfully");
        fetchPrompts();
      } else {
        alert("Failed to delete AI prompt");
      }
    } catch (error) {
      console.error("Error deleting AI prompt:", error);
      alert("Error deleting AI prompt");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = "/api/admin/ai-prompts";
      const method = modalMode === "create" ? "POST" : "PUT";
      const body = modalMode === "edit" 
        ? { ...formData, id: selectedPrompt?.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        alert(`AI prompt ${modalMode === "create" ? "created" : "updated"} successfully`);
        setShowModal(false);
        fetchPrompts();
      } else {
        const data = await response.json();
        alert(data.error || "Operation failed");
      }
    } catch (error) {
      console.error("Error saving AI prompt:", error);
      alert("Error saving AI prompt");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.prompt_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || prompt.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(prompts.map(p => p.category)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Prompts Management</h2>
          <p className="text-slate-600">Manage AI prompts and templates</p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Prompt
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setcategoryFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrompts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            No AI prompts found
          </div>
        ) : (
          filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{prompt.name}</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {prompt.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {prompt.is_active ? (
                    <CheckCircle className="w-5 h-5 text-green-600" title="Active" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" title="Inactive" />
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                {prompt.prompt_text}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Updated {new Date(prompt.updated_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(prompt)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit prompt"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(prompt.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete prompt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Showing <span className="font-semibold">{filteredPrompts.length}</span> of{" "}
          <span className="font-semibold">{prompts.length}</span> AI prompts
        </p>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h3 className="text-xl font-bold">
                {modalMode === "create" ? "Add New AI Prompt" : "Edit AI Prompt"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prompt Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Quiz Generator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="general">General</option>
                  <option value="quiz">Quiz</option>
                  <option value="summary">Summary</option>
                  <option value="explanation">Explanation</option>
                  <option value="practice">Practice</option>
                  <option value="flashcard">Flashcard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prompt Text *
                </label>
                <Textarea
                  value={formData.prompt_text}
                  onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                  required
                  rows={8}
                  placeholder="Enter the AI prompt template..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use variables like {"{topic}"}, {"{difficulty}"}, {"{count}"} in your prompt
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                  Active (available for use)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    modalMode === "create" ? "Create Prompt" : "Update Prompt"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

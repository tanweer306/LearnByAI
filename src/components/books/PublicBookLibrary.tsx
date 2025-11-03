"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, BookOpen, Users, Download } from "lucide-react";

interface PublicBook {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
  description: string;
  cover_image_url: string | null;
  total_pages: number;
  uploaded_by_role: string;
  created_at: string;
}

interface PublicBookLibraryProps {
  onAddBook?: (bookId: string) => void;
}

export default function PublicBookLibrary({ onAddBook }: PublicBookLibraryProps) {
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");

  useEffect(() => {
    fetchPublicBooks();
  }, []);

  const fetchPublicBooks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/books/public");
      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || []);
      }
    } catch (error) {
      console.error("Error fetching public books:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (bookId: string) => {
    try {
      const response = await fetch("/api/books/add-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });

      if (response.ok) {
        if (onAddBook) {
          onAddBook(bookId);
        }
        alert("Book added to your collection!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add book");
      }
    } catch (error) {
      console.error("Error adding book:", error);
      alert("Failed to add book");
    }
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject =
      selectedSubject === "all" || book.subject === selectedSubject;
    const matchesGrade =
      selectedGrade === "all" || book.grade_level === selectedGrade;
    return matchesSearch && matchesSubject && matchesGrade;
  });

  const subjects = Array.from(new Set(books.map((b) => b.subject).filter(Boolean)));
  const grades = Array.from(new Set(books.map((b) => b.grade_level).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-purple-600" />
          Public Book Library
        </h2>
        <p className="text-muted-foreground">
          Browse and add books shared by the community
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Subject Filter */}
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Subjects</option>
          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>

        {/* Grade Filter */}
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Grades</option>
          {grades.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading books...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
            No public books found
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your filters or search query
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="bg-card border-2 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              {/* Cover Image */}
              {book.cover_image_url ? (
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-lg mb-4 flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-purple-600" />
                </div>
              )}

              {/* Book Info */}
              <h3 className="font-bold text-lg mb-2 line-clamp-2">{book.title}</h3>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2 mb-3">
                {book.subject && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                    {book.subject}
                  </span>
                )}
                {book.grade_level && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                    {book.grade_level}
                  </span>
                )}
              </div>

              {/* Description */}
              {book.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {book.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  📄 {book.total_pages} pages
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Public
                </span>
              </div>

              {/* Add Button */}
              <Button
                onClick={() => handleAddBook(book.id)}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to My Books
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Results Count */}
      {!loading && filteredBooks.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredBooks.length} of {books.length} books
        </div>
      )}
    </div>
  );
}

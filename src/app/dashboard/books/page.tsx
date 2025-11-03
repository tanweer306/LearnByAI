"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Edit,
  Trash2,
  BookOpen,
  X,
  Save,
  Upload,
  Eye,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PublicBookLibrary from "@/components/books/PublicBookLibrary";

interface Book {
  id: string;
  title: string;
  subject: string | null;
  grade_level: string | null;
  description: string | null;
  cover_image_url: string | null;
  total_pages: number | null;
  status: string;
  is_public: boolean;
  created_at: string;
  user_id: string;
}

export default function BooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [userRole, setUserRole] = useState<string>("student");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editGradeLevel, setEditGradeLevel] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    fetchBooks();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role || "student");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/books/list");
      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || []);
      }
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setEditTitle(book.title);
    setEditSubject(book.subject || "");
    setEditGradeLevel(book.grade_level || "");
    setEditDescription(book.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingBook) return;

    try {
      const response = await fetch(`/api/books/${editingBook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          subject: editSubject,
          grade_level: editGradeLevel,
          description: editDescription,
        }),
      });

      if (response.ok) {
        alert("Book updated successfully!");
        setEditingBook(null);
        fetchBooks();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update book");
      }
    } catch (error) {
      console.error("Error updating book:", error);
      alert("Failed to update book");
    }
  };

  const handleDelete = async (bookId: string, isPublicBook: boolean) => {
    if (isPublicBook && userRole !== "admin") {
      alert("Only administrators can delete public books.");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this book? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Book deleted successfully!");
        fetchBooks();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete book");
      }
    } catch (error) {
      console.error("Error deleting book:", error);
      alert("Failed to delete book");
    }
  };

  const handleOpenBook = (bookId: string) => {
    router.push(`/ai-tutor/${bookId}`);
  };

  const filteredBooks = books.filter((book) =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link
            href="/dashboard/teacher"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"
          >
            <span aria-hidden="true">←</span>
            Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Books & Public Library</h1>
            <p className="text-muted-foreground mt-1">
              Manage your books or browse the public library
            </p>
          </div>
          <Link href="/dashboard/books/upload">
            <Button className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Book
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my-books" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="my-books">My Books</TabsTrigger>
            <TabsTrigger value="public-library">Public Library</TabsTrigger>
          </TabsList>

          {/* My Books Tab */}
          <TabsContent value="my-books" className="mt-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search my books..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Edit Modal */}
            {editingBook && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Edit Book</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingBook(null)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Title</label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Subject</label>
                      <Input
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Grade Level
                      </label>
                      <Input
                        value={editGradeLevel}
                        onChange={(e) => setEditGradeLevel(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Description
                      </label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button onClick={handleSaveEdit} className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditingBook(null)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Books Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading books...</p>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center py-12 border rounded-lg">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No books yet</h3>
                <p className="text-muted-foreground mb-6">
                  Upload your first book to get started
                </p>
                <Link href="/dashboard/books/upload">
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Your First Book
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBooks.map((book) => {
                  const canDelete = userRole === "admin" || !book.is_public;

                  return (
                    <div
                      key={book.id}
                      className="bg-card border-2 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-48 w-full overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#4C1D95] via-[#7C3AED] to-[#0EA5E9]" />
                        <div
                          className="absolute inset-0 opacity-35"
                          style={{
                            background:
                              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.45), transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.25), transparent 55%)",
                          }}
                        />
                        <div className="relative z-10 flex h-full flex-col justify-between px-5 pb-5 pt-12 text-white">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur">
                              <BookOpen className="h-9 w-9" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs uppercase tracking-wide text-white/70">
                                {book.subject || "Personal Library"}
                              </p>
                              <p className="text-xs text-white/60">
                                {book.grade_level ? book.grade_level : "Digital Edition"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-white/80">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span>{book.total_pages || 0} pages</span>
                            </div>
                            <span className="text-white/70">
                              {new Date(book.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {/* Status Badge */}
                        <span
                          className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                            book.status === "ready"
                              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : book.status === "processing"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {book.status}
                        </span>
                        {book.is_public && (
                          <span className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Public
                          </span>
                        )}
                      </div>

                      {/* Book Info */}
                      <div className="p-4">
                        <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                          {book.title}
                        </h3>

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
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {book.description}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            <span>{book.total_pages || 0} pages</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>
                              {new Date(book.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleOpenBook(book.id)}
                            className="flex-1"
                            disabled={book.status !== "ready"}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Open
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(book)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(book.id, book.is_public)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Results Count */}
            {!loading && filteredBooks.length > 0 && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                Showing {filteredBooks.length} of {books.length} books
              </div>
            )}
          </TabsContent>

          {/* Public Library Tab */}
          <TabsContent value="public-library" className="mt-6">
            <PublicBookLibrary
              onAddBook={(bookId) => {
                fetchBooks();
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

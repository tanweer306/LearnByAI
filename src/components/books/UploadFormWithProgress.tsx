"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Database,
  Cloud,
  Zap,
} from "lucide-react";

const ALLOWED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "text/plain": [".txt"],
  "application/epub+zip": [".epub"],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const SUBJECTS = [
  "Mathematics", "Science", "English", "History", "Geography",
  "Physics", "Chemistry", "Biology", "Computer Science", "Economics",
  "Literature", "Philosophy", "Psychology", "Sociology", "Other",
];

const GRADE_LEVELS = [
  "K-5 (Elementary)", "6-8 (Middle School)", "9-12 (High School)",
  "College", "Graduate", "Professional",
];

const ACCESS_TYPES = [
  { value: "personal", label: "Personal (Only me)", description: "Only you can access this book" },
  { value: "class", label: "Share with class", description: "Share with specific classes" },
  { value: "institution", label: "Institution-wide", description: "All users in your institution" },
  { value: "public", label: "Public (Everyone)", description: "Anyone can add to their collection" },
];

interface UploadFormWithProgressProps {
  userRole?: string;
  onSuccess?: () => void;
}

interface UploadProgress {
  step: number;
  totalSteps: number;
  message: string;
  percentage: number;
}

export default function UploadFormWithProgress({ userRole = "student", onSuccess }: UploadFormWithProgressProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress>({
    step: 0,
    totalSteps: 8,
    message: "",
    percentage: 0,
  });

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState("personal");
  const [isPublic, setIsPublic] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }

    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === "file-too-large") {
        setErrorMessage("File is too large. Maximum size is 50MB.");
      } else if (error.code === "file-invalid-type") {
        setErrorMessage("File type not supported.");
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    multiple: false,
  });

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(e.target.files[0]);
    }
  };

  const updateProgress = (step: number, message: string) => {
    const percentage = Math.round((step / 8) * 100);
    setProgress({ step, totalSteps: 8, message, percentage });
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage("Please select a file to upload");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Please enter a title for the book");
      return;
    }

    setUploading(true);
    setUploadStatus("uploading");
    setErrorMessage(null);
    updateProgress(0, "Starting upload...");

    try {
      updateProgress(1, "Preparing file...");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("subject", subject);
      formData.append("gradeLevel", gradeLevel);
      formData.append("description", description);
      formData.append("accessType", accessType);
      formData.append("isPublic", isPublic.toString());

      if (coverImage) {
        formData.append("coverImage", coverImage);
      }

      updateProgress(2, "Uploading to server...");
      const response = await fetch("/api/books/upload-with-progress", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.status === 409 && result.duplicate) {
        setErrorMessage(result.error);
        setUploadStatus("error");
        setUploading(false);
        return;
      }

      if (response.status === 403 && result.limitReached) {
        setErrorMessage(result.error);
        setUploadStatus("error");
        setUploading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      if (result.duplicate) {
        updateProgress(8, "Instant access granted!");
        setUploadStatus("success");
        
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            router.push("/dashboard/books");
          }
        }, 1500);
        return;
      }

      updateProgress(8, "Upload complete! Book is ready.");
      setUploadStatus("success");

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/dashboard/books");
        }
      }, 2000);

    } catch (error: any) {
      console.error("Upload error:", error);
      setErrorMessage(error.message || "Upload failed. Please try again.");
      setUploadStatus("error");
      updateProgress(0, "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border-2 rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4">Upload File</h3>
        
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                : "border-gray-300 dark:border-gray-700 hover:border-purple-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium mb-1">
              {isDragActive ? "Drop file here..." : "Drag & drop file here, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOCX, DOC, TXT, or EPUB (Max 50MB)
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <FileText className="h-10 w-10 text-purple-600" />
            <div className="flex-1">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            {!uploading && (
              <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {file && (
        <>
          <div className="bg-card border-2 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg mb-4">Book Details</h3>

            <div>
              <label className="block text-sm font-medium mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter book title"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={uploading}
              >
                <option value="">Select subject</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Grade Level</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={uploading}
              >
                <option value="">Select grade level</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the book"
                rows={3}
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cover Image (Optional)</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Access Type</label>
              <div className="space-y-2">
                {ACCESS_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      accessType === type.value
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accessType"
                      value={type.value}
                      checked={accessType === type.value}
                      onChange={(e) => setAccessType(e.target.value)}
                      disabled={uploading}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={uploading}
                className="h-4 w-4"
              />
              <label htmlFor="isPublic" className="text-sm font-medium">
                Make this book public
              </label>
            </div>
          </div>

          {uploading && (
            <div className="bg-card border-2 border-purple-500 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
                <div className="flex-1">
                  <p className="font-semibold">Uploading Book...</p>
                  <p className="text-sm text-muted-foreground">{progress.message}</p>
                </div>
                <span className="text-2xl font-bold text-purple-600">{progress.percentage}%</span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-700 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className={`flex flex-col items-center gap-1 ${progress.step >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
                  <Cloud className="h-5 w-5" />
                  <span>Upload S3</span>
                </div>
                <div className={`flex flex-col items-center gap-1 ${progress.step >= 3 ? 'text-purple-600' : 'text-gray-400'}`}>
                  <Database className="h-5 w-5" />
                  <span>Save DB</span>
                </div>
                <div className={`flex flex-col items-center gap-1 ${progress.step >= 5 ? 'text-purple-600' : 'text-gray-400'}`}>
                  <Zap className="h-5 w-5" />
                  <span>Process</span>
                </div>
                <div className={`flex flex-col items-center gap-1 ${progress.step >= 8 ? 'text-purple-600' : 'text-gray-400'}`}>
                  <CheckCircle className="h-5 w-5" />
                  <span>Complete</span>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Please wait... This may take a few minutes.
              </p>
            </div>
          )}

          {uploadStatus === "success" && (
            <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-500 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Upload Successful!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your book has been uploaded and processed. Redirecting...
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === "error" && errorMessage && (
            <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">Upload Failed</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    All changes have been rolled back. Please try again.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || !title.trim()}
            size="lg"
            className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Uploading... {progress.percentage}%
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Upload Book
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}

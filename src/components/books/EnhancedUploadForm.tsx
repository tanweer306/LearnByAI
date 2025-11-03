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
} from "lucide-react";

// Allowed file types
const ALLOWED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "text/plain": [".txt"],
  "application/epub+zip": [".epub"],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Predefined options
const SUBJECTS = [
  "Mathematics",
  "Science",
  "English",
  "History",
  "Geography",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Economics",
  "Literature",
  "Philosophy",
  "Psychology",
  "Sociology",
  "Other",
];

const GRADE_LEVELS = [
  "K-5 (Elementary)",
  "6-8 (Middle School)",
  "9-12 (High School)",
  "College",
  "Graduate",
  "Professional",
];

const ACCESS_TYPES = [
  { value: "personal", label: "Personal (Only me)", description: "Only you can access this book" },
  { value: "class", label: "Share with class", description: "Share with specific classes" },
  { value: "institution", label: "Institution-wide", description: "All users in your institution" },
  { value: "public", label: "Public (Everyone)", description: "Anyone can add to their collection" },
];

interface EnhancedUploadFormProps {
  userRole?: string;
  onSuccess?: () => void;
}

export default function EnhancedUploadForm({ userRole = "student", onSuccess }: EnhancedUploadFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [savings, setSavings] = useState<any>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState("personal");
  const [isPublic, setIsPublic] = useState(false);
  const [sharedWithAllClasses, setSharedWithAllClasses] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      // Auto-fill title from filename
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }

    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === "file-too-large") {
        setErrorMessage("File is too large. Maximum size is 50MB.");
      } else if (error.code === "file-invalid-type") {
        setErrorMessage("File type not supported. Please upload PDF, DOCX, DOC, TXT, or EPUB.");
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

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("subject", subject);
      formData.append("gradeLevel", gradeLevel);
      formData.append("description", description);
      formData.append("accessType", accessType);
      formData.append("isPublic", isPublic.toString());
      formData.append("sharedWithAllClasses", sharedWithAllClasses.toString());

      if (coverImage) {
        formData.append("coverImage", coverImage);
      }

      // Upload to enhanced API
      const response = await fetch("/api/books/upload-enhanced", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.status === 409 && result.duplicate) {
        // User already has access to this book
        setErrorMessage(result.error);
        setUploadStatus("error");
        return;
      }

      if (response.status === 403 && result.limitReached) {
        setErrorMessage(result.error);
        setUploadStatus("error");
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setUploadStatus("success");

      // Check if it was a duplicate
      if (result.duplicate && result.instantAccess) {
        setIsDuplicate(true);
        setSavings(result.savings);
      }

      // Redirect after success
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
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="font-medium">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="ml-2 text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium mb-2">
              {isDragActive ? "Drop file here" : "Drag & drop a file here"}
            </p>
            <p className="text-sm text-gray-500">
              or click to browse (PDF, DOCX, DOC, TXT, EPUB - Max 50MB)
            </p>
          </div>
        )}
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Book Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter book title"
            required
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium mb-2">Subject</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a subject</option>
            {SUBJECTS.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>

        {/* Grade Level */}
        <div>
          <label className="block text-sm font-medium mb-2">Grade Level</label>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select grade level</option>
            {GRADE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the book content..."
            rows={3}
          />
        </div>

        {/* Access Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Access Type</label>
          <div className="space-y-2">
            {ACCESS_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="accessType"
                  value={type.value}
                  checked={accessType === type.value}
                  onChange={(e) => setAccessType(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-sm text-gray-500">{type.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Public Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="isPublic" className="text-sm font-medium">
            Make this book publicly available (others can add to their collection)
          </label>
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium mb-2">Cover Image (Optional)</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
              <ImageIcon className="h-4 w-4" />
              <span className="text-sm">Choose Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                className="hidden"
              />
            </label>
            {coverImage && (
              <span className="text-sm text-gray-600">{coverImage.name}</span>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-sm text-red-800">{errorMessage}</span>
        </div>
      )}

      {/* Success Message */}
      {uploadStatus === "success" && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">
              {isDuplicate ? "Instant Access Granted!" : "Upload Successful!"}
            </span>
          </div>
          {isDuplicate && savings && (
            <div className="text-sm text-green-700 ml-7">
              <p>This book was already in our system.</p>
              <p>Saved ${savings.embeddingCost} in processing costs</p>
              <p>Saved ~{savings.processingTime} minutes of processing time</p>
            </div>
          )}
          {!isDuplicate && (
            <p className="text-sm text-green-700 ml-7">
              Your book is being processed. This may take a few minutes.
            </p>
          )}
        </div>
      )}

      {/* Upload Button */}
      <Button
        onClick={handleUpload}
        disabled={!file || uploading || uploadStatus === "success"}
        className="w-full"
        size="lg"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : uploadStatus === "success" ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Uploaded Successfully
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Book
          </>
        )}
      </Button>
    </div>
  );
}

'use client';

import { BookOpen, User, FileText, Hash, Calendar } from 'lucide-react';

interface BookMetadata {
  id: string;
  title: string;
  author?: string;
  subject?: string;
  total_pages?: number;
  file_size?: number;
  created_at?: string;
  chapters?: Array<{
    title: string;
    startPage: number;
    endPage: number;
  }>;
}

interface BookMetadataPanelProps {
  metadata: BookMetadata;
  onChapterSelect?: (pageNumber: number) => void;
}

export default function BookMetadataPanel({ metadata, onChapterSelect }: BookMetadataPanelProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-4">
        {/* Book Icon */}
        <div className="w-12 h-16 bg-gradient-to-br from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] rounded flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-6 w-6 text-white dark:text-gray-900" />
        </div>

        {/* Book Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 mb-2">
            {metadata.title}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {metadata.author && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <User className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{metadata.author}</span>
              </div>
            )}

            {metadata.subject && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{metadata.subject}</span>
              </div>
            )}

            {metadata.total_pages && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Hash className="h-4 w-4 flex-shrink-0" />
                <span>{metadata.total_pages} pages</span>
              </div>
            )}

            {metadata.file_size && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span>{formatFileSize(metadata.file_size)}</span>
              </div>
            )}

            {metadata.created_at && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>{formatDate(metadata.created_at)}</span>
              </div>
            )}
          </div>

          {/* Chapters */}
          {metadata.chapters && metadata.chapters.length > 0 && (
            <div className="mt-3">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase block mb-1">
                Chapters
              </label>
              <select
                className="w-full max-w-md text-sm p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const pageNum = parseInt(e.target.value);
                  if (pageNum && onChapterSelect) {
                    onChapterSelect(pageNum);
                  }
                }}
                defaultValue=""
              >
                <option value="">Select a chapter...</option>
                {metadata.chapters.map((chapter, idx) => (
                  <option key={idx} value={chapter.startPage}>
                    {chapter.title} (p.{chapter.startPage}-{chapter.endPage})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

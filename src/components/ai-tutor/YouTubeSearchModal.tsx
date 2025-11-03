"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Loader2, ExternalLink, Play } from "lucide-react";

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  description: string;
  url: string;
}

interface YouTubeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId?: string;
  selectedText?: string;
  bookTitle?: string;
  initialQuery?: string;
}

export default function YouTubeSearchModal({
  isOpen,
  onClose,
  bookId,
  selectedText = "",
  bookTitle = "",
  initialQuery = "",
}: YouTubeSearchModalProps) {
  const [query, setQuery] = useState("");
  const [isGeneratingQuery, setIsGeneratingQuery] = useState(false);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);

  // Generate smart search query when modal opens
  useEffect(() => {
    if (isOpen) {
      generateSearchQuery();
    } else {
      setQuery("");
      setVideos([]);
      setSelectedVideo(null);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedText, bookTitle, initialQuery]);

  const generateSearchQuery = () => {
    setIsGeneratingQuery(true);

    const trimmedInitial = initialQuery.trim();
    if (trimmedInitial) {
      setQuery(trimmedInitial);
      setIsGeneratingQuery(false);
      return;
    }
    
    // Extract key terms from selected text
    if (selectedText && selectedText.trim().length > 10) {
      // Remove common words and extract key terms
      const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'];
      
      const words = selectedText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.includes(word))
        .slice(0, 5);
      
      if (words.length > 0) {
        setQuery(words.join(' '));
      } else {
        setQuery(selectedText.split(/\s+/).slice(0, 5).join(' '));
      }
    } else {
      setQuery(bookTitle);
    }
    
    setIsGeneratingQuery(false);
  };

  const searchVideos = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/search/youtube?q=${encodeURIComponent(query + " educational tutorial")}`
      );

      if (!response.ok) {
        throw new Error("Failed to search videos");
      }

      const data = await response.json();
      setVideos(data.videos || []);
    } catch (err: any) {
      setError(err.message || "Failed to search videos");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchVideos();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-bold">YouTube Educational Videos</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for educational videos..."
              className="flex-1"
              disabled={isGeneratingQuery}
            />
            <Button onClick={searchVideos} disabled={loading || isGeneratingQuery || !query.trim()}>
              {loading || isGeneratingQuery ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>

        {/* Two-Section Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Video List */}
          <div className="w-1/3 border-r overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-4">
                <Play className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-center text-sm">Search for educational videos to get started</p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className={`w-full text-left border rounded-lg overflow-hidden hover:shadow-md transition-all ${
                      selectedVideo?.id === video.id
                        ? "ring-2 ring-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      {selectedVideo?.id === video.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary rounded-full p-2">
                            <Play className="h-4 w-4 text-primary-foreground fill-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">
                        {video.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {video.channelTitle}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Video Player */}
          <div className="flex-1 flex flex-col bg-muted/30">
            {selectedVideo ? (
              <>
                <div className="aspect-video bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-lg flex-1">{selectedVideo.title}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={selectedVideo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open in YouTube
                      </a>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    <span className="font-medium">Channel:</span> {selectedVideo.channelTitle}
                  </p>
                  <div className="text-sm">
                    <p className="font-medium mb-2">Description:</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedVideo.description || "No description available."}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Play className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">No video selected</p>
                <p className="text-sm">Click on a video from the list to play it here</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            Videos are sourced from YouTube. Click to watch on YouTube.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Loader2, ExternalLink, Image as ImageIcon, Download } from "lucide-react";

interface ImageResult {
  id: string;
  title: string;
  thumbnail: string;
  fullImage: string;
  source: string;
  sourceUrl: string;
  width: number;
  height: number;
}

interface ImagesSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId?: string;
  selectedText?: string;
  bookTitle?: string;
  initialQuery?: string;
}

export default function ImagesSearchModal({
  isOpen,
  onClose,
  bookId,
  selectedText = "",
  bookTitle = "",
  initialQuery = "",
}: ImagesSearchModalProps) {
  const [query, setQuery] = useState("");
  const [isGeneratingQuery, setIsGeneratingQuery] = useState(false);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);

  // Generate smart search query when modal opens
  useEffect(() => {
    if (isOpen) {
      generateSearchQuery();
    } else {
      setQuery("");
      setImages([]);
      setSelectedImage(null);
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

  const searchImages = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/search/images?q=${encodeURIComponent(query + " diagram educational")}`
      );

      if (!response.ok) {
        throw new Error("Failed to search images");
      }

      const data = await response.json();
      setImages(data.images || []);
    } catch (err: any) {
      setError(err.message || "Failed to search images");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchImages();
    }
  };

  const downloadImage = (image: ImageResult) => {
    const link = document.createElement("a");
    link.href = image.fullImage;
    link.download = `${image.title}.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold">Educational Images & Diagrams</h2>
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
              placeholder="Search for diagrams, charts, illustrations..."
              className="flex-1"
              disabled={isGeneratingQuery}
            />
            <Button onClick={searchImages} disabled={loading || isGeneratingQuery || !query.trim()}>
              {loading ? (
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

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
              <p>Search for educational images and diagrams</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-slate-200 dark:bg-slate-800">
                    <img
                      src={image.fullImage}
                      srcSet={`${image.thumbnail} 150w, ${image.fullImage} ${image.width || 800}w`}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      loading="lazy"
                      onError={(event) => {
                        const target = event.currentTarget;
                        if (target.src !== image.thumbnail) {
                          target.src = image.thumbnail;
                          target.removeAttribute("srcset");
                          target.removeAttribute("sizes");
                        }
                      }}
                      alt={image.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <p className="text-xs font-medium line-clamp-2 mb-1">
                      {image.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {image.width} × {image.height}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            Images are sourced from educational resources. Click to view full size.
          </p>
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-background border rounded-lg shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{selectedImage.title}</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadImage(selectedImage)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.fullImage}
                alt={selectedImage.title}
                className="max-w-full max-h-[70vh] mx-auto"
              />
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Source: {selectedImage.source}</p>
                <a
                  href={selectedImage.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                >
                  View original
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

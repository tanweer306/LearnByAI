'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Trash2, Plus, Loader2, Clock, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  bookId: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface ConversationHistoryProps {
  bookId: string;
  currentConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConversationHistory({
  bookId,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  isOpen,
  onClose,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && bookId) {
      loadConversations();
    }
  }, [isOpen, bookId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai-tutor/conversations?bookId=${bookId}`);
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;

    setDeletingId(conversationId);
    try {
      await fetch(`/api/ai-tutor/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      setConversations(conversations.filter((c) => c.id !== conversationId));
      if (currentConversationId === conversationId) {
        onNewConversation();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full lg:w-80 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Chat History</h3>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={onNewConversation}
          size="sm"
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No conversations yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Start chatting to see history
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  onConversationSelect(conversation.id);
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors group ${
                  currentConversationId === conversation.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                      {conversation.preview}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(conversation.updatedAt), {
                          addSuffix: true,
                        })}
                      </span>
                      <span>•</span>
                      <span>{conversation.messageCount} messages</span>
                    </div>
                  </div>
                  <Button
                    onClick={(e) => handleDelete(conversation.id, e)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={deletingId === conversation.id}
                  >
                    {deletingId === conversation.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3 text-red-600" />
                    )}
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
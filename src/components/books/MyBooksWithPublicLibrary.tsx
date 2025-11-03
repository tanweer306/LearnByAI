"use client";

import { useState } from "react";
import PublicBookLibrary from "@/components/books/PublicBookLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MyBooksWithPublicLibraryProps {
  children: React.ReactNode;
}

export default function MyBooksWithPublicLibrary({ children }: MyBooksWithPublicLibraryProps) {
  return (
    <div className="space-y-8">
      <Tabs defaultValue="my-books" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="my-books">My Books</TabsTrigger>
          <TabsTrigger value="public-library">Public Library</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-books" className="mt-6">
          {children}
        </TabsContent>
        
        <TabsContent value="public-library" className="mt-6">
          <PublicBookLibrary 
            onAddBook={(bookId) => {
              // Refresh page to show newly added book
              window.location.reload();
            }} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

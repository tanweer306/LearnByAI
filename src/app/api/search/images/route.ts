import { NextRequest, NextResponse } from "next/server";

type GoogleImageItem = {
  link?: string;
  title?: string;
  displayLink?: string;
  image?: {
    thumbnailLink?: string;
    contextLink?: string;
    width?: number;
    height?: number;
  };
};

type NormalizedImage = {
  id: string;
  title: string;
  thumbnail: string;
  fullImage: string;
  source: string;
  sourceUrl: string;
  width: number;
  height: number;
};

const extractHost = (url: string | undefined) => {
  if (!url) return "Unknown source";
  try {
    return new URL(url).hostname;
  } catch {
    return "Unknown source";
  }
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      return NextResponse.json(
        { error: "Google Search API not configured" },
        { status: 500 }
      );
    }

    // Use Google Custom Search API
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?` +
        new URLSearchParams({
          key: apiKey,
          cx: searchEngineId,
          q: query,
          searchType: "image",
          num: "10",
          imgSize: "large",
          safe: "active",
        })
    );

    const responseText = await response.text();

    if (!response.ok) {
      let details: string | undefined;
      try {
        const errorPayload = JSON.parse(responseText);
        details = errorPayload?.error?.message;
      } catch {
        details = responseText;
      }

      console.error("Google image search error response:", details ?? responseText);

      return NextResponse.json(
        {
          error: "Google Search API request failed",
          details,
        },
        { status: response.status }
      );
    }

    let data: { items?: GoogleImageItem[] };
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Google image search response:", parseError);
      return NextResponse.json(
        {
          error: "Failed to parse Google response",
        },
        { status: 502 }
      );
    }

    const images: NormalizedImage[] = (data.items || [])
      .map((item, index) => {
        if (!item.link || !item.image?.thumbnailLink) {
          return null;
        }

        return {
          id: `${item.link}-${index}`,
          title: item.title || "Untitled image",
          thumbnail: item.image.thumbnailLink,
          fullImage: item.link,
          source: item.displayLink || extractHost(item.link),
          sourceUrl: item.image.contextLink || item.link,
          width: item.image.width ?? 0,
          height: item.image.height ?? 0,
        } satisfies NormalizedImage;
      })
      .filter(Boolean) as NormalizedImage[];

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Image search error:", error);
    return NextResponse.json(
      { error: "Failed to search images" },
      { status: 500 }
    );
  }
}

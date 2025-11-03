/**
 * Referral Link Management Dashboard
 * View and manage all generated referral links
 */

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Link as LinkIcon,
  Copy,
  Check,
  X,
  Users,
  Calendar,
  Gift,
  Loader2,
  AlertCircle,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import StudentHeader from "@/components/dashboard/StudentHeader";

interface ReferralLink {
  id: string;
  link_code: string;
  link_type: string;
  discount_percentage: number;
  max_uses: number | null;
  current_uses: number;
  valid_until: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export default function ReferralManagePage() {
  const { user } = useUser();
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchLinks();
    }
  }, [user]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/referral/list");

      if (!response.ok) {
        throw new Error("Failed to fetch links");
      }

      const data = await response.json();
      setLinks(data.links || []);
    } catch (err: any) {
      console.error("Error fetching links:", err);
      setError(err.message || "Failed to load links");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (linkCode: string, linkId: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const linkUrl = `${baseUrl}/signup?ref=${linkCode}`;

    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopiedId(linkId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleToggleActive = async (linkId: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/referral/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update link status");
      }

      // Refresh links
      fetchLinks();
    } catch (err) {
      console.error("Error toggling link:", err);
      alert("Failed to update link status");
    }
  };

  const getLinkUrl = (linkCode: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${baseUrl}/signup?ref=${linkCode}`;
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isMaxUsesReached = (link: ReferralLink) => {
    if (!link.max_uses) return false;
    return link.current_uses >= link.max_uses;
  };

  const getStatusBadge = (link: ReferralLink) => {
    if (!link.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (isExpired(link.valid_until)) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (isMaxUsesReached(link)) {
      return <Badge variant="destructive">Max Uses Reached</Badge>;
    }
    return <Badge className="bg-green-500">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader userName={user?.firstName || "User"} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#99CE79]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader userName={user?.firstName || "User"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent">
                  Referral Links
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Manage your referral and discount links
              </p>
            </div>
            <Link href="/dashboard/referral/generate">
              <Button className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900">
                <LinkIcon className="h-4 w-4 mr-2" />
                Generate New Link
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{links.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {links.filter((l) => l.is_active && !isExpired(l.valid_until)).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Redemptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {links.reduce((sum, link) => sum + link.current_uses, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Links Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Links</CardTitle>
            <CardDescription>
              View and manage all your generated referral links
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </div>
            )}

            {links.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Links Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate your first referral link to get started
                </p>
                <Link href="/dashboard/referral/generate">
                  <Button>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Generate Link
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {link.link_code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopy(link.link_code, link.id)}
                            >
                              {copiedId === link.id ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          {link.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {link.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Gift className="h-4 w-4 text-[#99CE79]" />
                            <span className="font-medium">
                              {link.discount_percentage}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {link.current_uses}
                              {link.max_uses ? ` / ${link.max_uses}` : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {link.valid_until ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(link.valid_until).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Never
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(link)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleToggleActive(link.id, link.is_active)
                              }
                            >
                              {link.is_active ? (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(getLinkUrl(link.link_code), "_blank")
                              }
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

/**
 * Referral Link Generator Component
 * Allows teachers and institutes to generate discount/free subscription links
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Link as LinkIcon,
  Copy,
  Check,
  Loader2,
  Users,
  Gift,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReferralLinkGeneratorProps {
  userId: string;
  userRole: "teacher" | "institute";
  classes?: Array<{ id: string; name: string }>;
  availableSeats?: number;
  canOfferDiscount?: boolean;
  maxDiscountPercentage?: number;
}

interface GeneratedLink {
  linkCode: string;
  linkUrl: string;
  discountPercentage: number;
  linkType: string;
  expiresAt?: string;
}

export default function ReferralLinkGenerator({
  userId,
  userRole,
  classes = [],
  availableSeats = 0,
  canOfferDiscount = false,
  maxDiscountPercentage = 30,
}: ReferralLinkGeneratorProps) {
  const [linkType, setLinkType] = useState<"discount" | "free">("discount");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [discountPercentage, setDiscountPercentage] = useState<number>(
    maxDiscountPercentage
  );
  const [maxUses, setMaxUses] = useState<number>(0);
  const [expiryDays, setExpiryDays] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);

    try {
      // Validate inputs
      if (userRole === "teacher" && !selectedClass) {
        throw new Error("Please select a class");
      }

      if (linkType === "discount" && !canOfferDiscount) {
        throw new Error("You don't have permission to offer discounts");
      }

      if (userRole === "institute" && linkType === "free" && availableSeats <= 0) {
        throw new Error("No available seats. Please upgrade your plan.");
      }

      const response = await fetch("/api/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userRole,
          linkType:
            userRole === "teacher"
              ? "teacher_class"
              : linkType === "free"
                ? "institution"
                : "institution",
          classId: selectedClass || null,
          discountPercentage: linkType === "free" ? 100 : discountPercentage,
          maxUses: maxUses || null,
          expiryDays: expiryDays || null,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate link");
      }

      setGeneratedLink(data.link);
    } catch (err: any) {
      console.error("Error generating link:", err);
      setError(err.message || "Failed to generate link");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink.linkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleReset = () => {
    setGeneratedLink(null);
    setError(null);
    setDescription("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-[#99CE79]" />
          Generate Referral Link
        </CardTitle>
        <CardDescription>
          {userRole === "teacher"
            ? "Create a discount link for students in your class"
            : "Create free or discounted subscription links for your students"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!generatedLink ? (
          <>
            {/* Link Type (Institute Only) */}
            {userRole === "institute" && (
              <div className="space-y-2">
                <Label>Link Type</Label>
                <Select
                  value={linkType}
                  onValueChange={(value: "discount" | "free") =>
                    setLinkType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">
                      Free Subscription (Uses Seat)
                    </SelectItem>
                    <SelectItem value="discount">
                      Discounted Subscription
                    </SelectItem>
                  </SelectContent>
                </Select>
                {linkType === "free" && (
                  <p className="text-xs text-muted-foreground">
                    Available seats: {availableSeats}
                  </p>
                )}
              </div>
            )}

            {/* Class Selection (Teacher Only) */}
            {userRole === "teacher" && classes.length > 0 && (
              <div className="space-y-2">
                <Label>Select Class *</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Discount Percentage */}
            {linkType === "discount" && (
              <div className="space-y-2">
                <Label>Discount Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={maxDiscountPercentage}
                    value={discountPercentage}
                    onChange={(e) =>
                      setDiscountPercentage(Number(e.target.value))
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Max: {maxDiscountPercentage}%
                  </span>
                </div>
              </div>
            )}

            {/* Max Uses */}
            <div className="space-y-2">
              <Label>Maximum Uses (Optional)</Label>
              <Input
                type="number"
                min={0}
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                placeholder="0 = Unlimited"
              />
              <p className="text-xs text-muted-foreground">
                Leave as 0 for unlimited uses
              </p>
            </div>

            {/* Expiry */}
            <div className="space-y-2">
              <Label>Expires In (Days, Optional)</Label>
              <Input
                type="number"
                min={0}
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                placeholder="0 = Never expires"
              />
              <p className="text-xs text-muted-foreground">
                Leave as 0 for no expiration
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Spring 2025 Enrollment"
              />
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating || !canOfferDiscount}
              className="w-full bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Generate Link
                </>
              )}
            </Button>

            {!canOfferDiscount && (
              <p className="text-xs text-center text-muted-foreground">
                Upgrade to premium to generate referral links
              </p>
            )}
          </>
        ) : (
          <>
            {/* Generated Link Display */}
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    Link Generated Successfully!
                  </h4>
                </div>

                {/* Link Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 dark:text-green-300">
                      {generatedLink.discountPercentage}% discount
                    </span>
                  </div>
                  {generatedLink.expiresAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="text-green-700 dark:text-green-300">
                        Expires:{" "}
                        {new Date(generatedLink.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Copy Link */}
              <div className="space-y-2">
                <Label>Share this link with your students:</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedLink.linkUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Link Code */}
              <div className="space-y-2">
                <Label>Link Code:</Label>
                <code className="block p-3 bg-muted rounded-lg text-sm font-mono">
                  {generatedLink.linkCode}
                </code>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Generate Another
                </Button>
                <Button
                  onClick={() => window.open("/dashboard/referral/manage", "_blank")}
                  variant="outline"
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Links
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

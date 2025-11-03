"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features?: string[];
}

export default function ComingSoon({
  title,
  description,
  icon: Icon,
  features = [],
}: ComingSoonProps) {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      data-oid="czpop7-"
    >
      <div className="max-w-2xl w-full text-center" data-oid="uycqlw2">
        <div className="mb-8 flex justify-center" data-oid="by9.c_k">
          <div
            className="h-24 w-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg"
            data-oid="2j7mjyg"
          >
            <Icon className="h-12 w-12 text-white" data-oid="szoyid4" />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4" data-oid="e.yaq:a">
          {title}
        </h1>
        <p className="text-lg text-muted-foreground mb-8" data-oid="u22gbz-">
          {description}
        </p>

        {features.length > 0 && (
          <div
            className="bg-card border rounded-xl p-6 mb-8"
            data-oid="--es8kk"
          >
            <h2 className="text-xl font-semibold mb-4" data-oid="8mvo3rl">
              Coming Features:
            </h2>
            <ul
              className="space-y-2 text-left max-w-md mx-auto"
              data-oid="i7pis_3"
            >
              {features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3"
                  data-oid="gbourbz"
                >
                  <span className="text-green-500 mt-1" data-oid="m:08dn2">
                    ✓
                  </span>
                  <span className="text-muted-foreground" data-oid="cqo01sp">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          data-oid="5t7ahr9"
        >
          <Link href="/dashboard/student" data-oid="8-3zffb">
            <Button
              variant="gradient"
              size="lg"
              className="gap-2"
              data-oid="uke-0gj"
            >
              <ArrowLeft className="h-4 w-4" data-oid="a--f_ik" />
              Back to Dashboard
            </Button>
          </Link>
          <Button variant="outline" size="lg" data-oid="5qdggnb">
            Notify Me When Ready
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground" data-oid="ievfa9q">
          This feature is currently under development. Stay tuned!
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { ThemeAwareLogo } from "@/components/layout/ThemeAwareLogo";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const gradeLevels = [
  "Elementary (1-5)",
  "Middle School (6-8)",
  "High School (9-12)",
  "Undergraduate",
  "Graduate",
  "Professional/Other",
];

const countries = [
  "United States",
  "United Kingdom",
  "Canada",
  "India",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "China",
  "Japan",
  "Other",
];

export default function StudentOnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    gradeLevel: "",
    schoolName: "",
    country: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    languagePreference: "en",
    dateOfBirth: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send onboarding data to API
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: "student",
          ...formData,
        }),
      });

      if (response.ok) {
        // Redirect to student dashboard
        router.push("/dashboard/student");
      } else {
        throw new Error("Failed to complete onboarding");
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      data-oid="7n5hg1n"
    >
      <div className="max-w-2xl w-full" data-oid="n7biolj">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
          data-oid="hir7_eb"
        >
          <div className="mb-4 flex justify-center" data-oid="krw.yo.">
            <ThemeAwareLogo className="h-12 w-auto" />
          </div>

          <h1
            className="text-3xl md:text-4xl font-bold mb-2"
            data-oid="_gpl7i1"
          >
            Student{" "}
            <span
              className="bg-gradient-to-r from-gray-700 to-gray-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
              data-oid="n_sugub"
            >
              Setup
            </span>
          </h1>
          <p className="text-muted-foreground" data-oid="hq6r78s">
            Help us personalize your learning experience
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="bg-card border-2 rounded-xl p-8 space-y-6"
          data-oid="jknaw00"
        >
          {/* Grade Level */}
          <div data-oid="fnvb3lu">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="wvwwtd6"
            >
              Current Grade Level{" "}
              <span className="text-red-500" data-oid="9o408hj">
                *
              </span>
            </label>
            <select
              required
              value={formData.gradeLevel}
              onChange={(e) =>
                setFormData({ ...formData, gradeLevel: e.target.value })
              }
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="r6kpr:3"
            >
              <option value="" data-oid="ywo7.ak">
                Select your grade level
              </option>
              {gradeLevels.map((level) => (
                <option key={level} value={level} data-oid="jntwe3.">
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* School/University Name */}
          <div data-oid=":papphv">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="e9ucdg4"
            >
              School/University Name
            </label>
            <input
              type="text"
              value={formData.schoolName}
              onChange={(e) =>
                setFormData({ ...formData, schoolName: e.target.value })
              }
              placeholder="e.g., Lincoln High School"
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="9oscv6d"
            />
          </div>

          {/* Country */}
          <div data-oid="49edmw:">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="f5bi783"
            >
              Country{" "}
              <span className="text-red-500" data-oid="0upcm39">
                *
              </span>
            </label>
            <select
              required
              value={formData.country}
              onChange={(e) =>
                setFormData({ ...formData, country: e.target.value })
              }
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="-dpc42b"
            >
              <option value="" data-oid="a3u2ayi">
                Select your country
              </option>
              {countries.map((country) => (
                <option key={country} value={country} data-oid="hive9di">
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* Language Preference */}
          <div data-oid="keek:tz">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="g1il1bj"
            >
              Preferred Language
            </label>
            <select
              value={formData.languagePreference}
              onChange={(e) =>
                setFormData({ ...formData, languagePreference: e.target.value })
              }
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid=":9b34n5"
            >
              <option value="en" data-oid="_iu:ekk">
                English
              </option>
              <option value="es" data-oid="b.wri0b">
                Spanish
              </option>
              <option value="fr" data-oid="te5g35s">
                French
              </option>
              <option value="de" data-oid="m79v:5m">
                German
              </option>
              <option value="zh" data-oid="gqfovjt">
                Chinese
              </option>
              <option value="hi" data-oid=":9dj8.w">
                Hindi
              </option>
              <option value="ar" data-oid="degz.tg">
                Arabic
              </option>
              <option value="pt" data-oid="cc8mqfo">
                Portuguese
              </option>
              <option value="ja" data-oid="0j5:y2a">
                Japanese
              </option>
              <option value="other" data-oid=":v5p2n:">
                Other
              </option>
            </select>
          </div>

          {/* Date of Birth */}
          <div data-oid="2bgvd5n">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="ur:k9uq"
            >
              Date of Birth (Optional)
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData({ ...formData, dateOfBirth: e.target.value })
              }
              max={new Date().toISOString().split("T")[0]}
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="4trd8yr"
            />

            <p
              className="text-xs text-muted-foreground mt-1"
              data-oid="qnoz17i"
            >
              Helps us provide age-appropriate content
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4" data-oid="q3lqsbk">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/onboarding")}
              className="flex-1"
              data-oid="hs:1wfr"
            >
              <ArrowLeft className="h-4 w-4 mr-2" data-oid="28qqd18" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.gradeLevel || !formData.country}
              className="flex-1 bg-gradient-to-r from-gray-700 to-gray-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900"
              data-oid="nhya.p9"
            >
              {loading ? (
                <>
                  <Loader2
                    className="h-4 w-4 mr-2 animate-spin"
                    data-oid="a-:yra1"
                  />
                  Setting up...
                </>
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="h-4 w-4 ml-2" data-oid="wsdluxo" />
                </>
              )}
            </Button>
          </div>
        </motion.form>

        {/* Progress Indicator */}
        <div className="mt-6 text-center" data-oid="xhqv00x">
          <div
            className="flex items-center justify-center gap-2"
            data-oid="e5:244g"
          >
            <div
              className="h-2 w-2 rounded-full bg-[#99CE79]"
              data-oid="9.dngds"
            />

            <div
              className="h-2 w-16 rounded-full bg-[#99CE79]"
              data-oid="vt1r:tz"
            />

            <div
              className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700"
              data-oid="8sdaa-_"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2" data-oid="4q.fqme">
            Step 2 of 2
          </p>
        </div>
      </div>
    </div>
  );
}

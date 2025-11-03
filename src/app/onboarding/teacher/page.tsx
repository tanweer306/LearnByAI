"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ThemeAwareLogo } from "@/components/layout/ThemeAwareLogo";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Loader2, X } from "lucide-react";

const subjects = [
  "Mathematics",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "History",
  "Geography",
  "Computer Science",
  "Languages",
  "Arts",
  "Physical Education",
  "Other",
];

const teachingLevels = [
  "Elementary School",
  "Middle School",
  "High School",
  "Undergraduate",
  "Graduate",
  "Professional Training",
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

export default function TeacherOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    subjects: [] as string[],
    teachingLevel: "",
    yearsOfExperience: "",
    qualification: "",
    schoolName: "",
    country: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    languagePreference: "en",
    phoneNumber: "",
  });

  const toggleSubject = (subject: string) => {
    if (formData.subjects.includes(subject)) {
      setFormData({
        ...formData,
        subjects: formData.subjects.filter((s) => s !== subject),
      });
    } else {
      setFormData({
        ...formData,
        subjects: [...formData.subjects, subject],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: "teacher",
          ...formData,
        }),
      });

      if (response.ok) {
        router.push("/dashboard/teacher");
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
      data-oid="-yiyedb"
    >
      <div className="max-w-3xl w-full" data-oid="n3-83kv">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
          data-oid="vadw59p"
        >
          <div className="mb-4 flex justify-center" data-oid="2rq61m3">
            <ThemeAwareLogo className="h-12 w-auto" />
          </div>

          <h1
            className="text-3xl md:text-4xl font-bold mb-2"
            data-oid="-rcvdz3"
          >
            Teacher{" "}
            <span
              className="bg-gradient-to-r from-gray-700 to-gray-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
              data-oid="k2p1lx1"
            >
              Profile Setup
            </span>
          </h1>
          <p className="text-muted-foreground" data-oid="p9dhy61">
            Tell us about your teaching experience
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="bg-card border-2 rounded-xl p-8 space-y-6"
          data-oid="biz0u2_"
        >
          {/* Subjects Taught */}
          <div data-oid="9.6tzct">
            <label
              className="block text-sm font-medium mb-3"
              data-oid="vql2-xv"
            >
              Subjects You Teach{" "}
              <span className="text-red-500" data-oid="rjnj_.d">
                *
              </span>
            </label>
            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              data-oid="lfg32eh"
            >
              {subjects.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => toggleSubject(subject)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.subjects.includes(subject)
                      ? "border-[#99CE79] bg-[#99CE79]/10 text-[#99CE79]"
                      : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                  }`}
                  data-oid="y:wc-:b"
                >
                  {subject}
                  {formData.subjects.includes(subject) && (
                    <X className="h-3 w-3 inline ml-1" data-oid="r45u4x6" />
                  )}
                </button>
              ))}
            </div>
            <p
              className="text-xs text-muted-foreground mt-2"
              data-oid="uwf9xff"
            >
              Select all that apply
            </p>
          </div>

          {/* Teaching Level */}
          <div data-oid="xv30hl3">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="8_xe76y"
            >
              Teaching Level{" "}
              <span className="text-red-500" data-oid=".p0.xz_">
                *
              </span>
            </label>
            <select
              required
              value={formData.teachingLevel}
              onChange={(e) =>
                setFormData({ ...formData, teachingLevel: e.target.value })
              }
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="j:cqv8f"
            >
              <option value="" data-oid="n8l2cig">
                Select teaching level
              </option>
              {teachingLevels.map((level) => (
                <option key={level} value={level} data-oid="laie3up">
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Years of Experience */}
          <div data-oid="svd:j6k">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="nm-y.6p"
            >
              Years of Teaching Experience{" "}
              <span className="text-red-500" data-oid="we1ru3r">
                *
              </span>
            </label>
            <input
              type="number"
              required
              min="0"
              max="50"
              value={formData.yearsOfExperience}
              onChange={(e) =>
                setFormData({ ...formData, yearsOfExperience: e.target.value })
              }
              placeholder="e.g., 5"
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="caax6t0"
            />
          </div>

          {/* Qualification */}
          <div data-oid="kp.o_bz">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="jki.q7-"
            >
              Highest Qualification
            </label>
            <input
              type="text"
              value={formData.qualification}
              onChange={(e) =>
                setFormData({ ...formData, qualification: e.target.value })
              }
              placeholder="e.g., M.Ed, B.A. in Mathematics"
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="tdzyvhr"
            />
          </div>

          {/* School/Institution Name */}
          <div data-oid="85jtm9e">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="el5m757"
            >
              Current School/Institution
            </label>
            <input
              type="text"
              value={formData.schoolName}
              onChange={(e) =>
                setFormData({ ...formData, schoolName: e.target.value })
              }
              placeholder="e.g., Washington High School"
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="4-9xvvk"
            />
          </div>

          {/* Country */}
          <div data-oid="tnrmdon">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="zy26:pn"
            >
              Country{" "}
              <span className="text-red-500" data-oid="t413ovr">
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
              data-oid="t9v401h"
            >
              <option value="" data-oid="qa_05q1">
                Select your country
              </option>
              {countries.map((country) => (
                <option key={country} value={country} data-oid="sm70vfo">
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* Phone Number */}
          <div data-oid="-2qk_qt">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="6clnqmf"
            >
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
              placeholder="+1 (555) 123-4567"
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="5usvlhl"
            />

            <p
              className="text-xs text-muted-foreground mt-1"
              data-oid="jumsn.c"
            >
              For important class notifications
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4" data-oid="7z9nus.">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/onboarding")}
              className="flex-1"
              data-oid="6149bz1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" data-oid="hsq31q." />
              Back
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                formData.subjects.length === 0 ||
                !formData.teachingLevel ||
                !formData.country
              }
              className="flex-1 bg-gradient-to-r from-gray-700 to-gray-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900"
              data-oid="qkgk1mz"
            >
              {loading ? (
                <>
                  <Loader2
                    className="h-4 w-4 mr-2 animate-spin"
                    data-oid="yl3cpa5"
                  />
                  Setting up...
                </>
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="h-4 w-4 ml-2" data-oid="7o:n8:t" />
                </>
              )}
            </Button>
          </div>
        </motion.form>

        {/* Progress Indicator */}
        <div className="mt-6 text-center" data-oid="t40lba9">
          <div
            className="flex items-center justify-center gap-2"
            data-oid="x9r76sr"
          >
            <div
              className="h-2 w-2 rounded-full bg-[#99CE79]"
              data-oid="h8mb8mv"
            />

            <div
              className="h-2 w-16 rounded-full bg-[#99CE79]"
              data-oid="u7ne5ry"
            />

            <div
              className="h-2 w-2 rounded-full bg-[#99CE79]"
              data-oid="t6co-4w"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2" data-oid="f0-kwx4">
            Step 2 of 2
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ThemeAwareLogo } from "@/components/layout/ThemeAwareLogo";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Users,
  Building2,
  ArrowRight,
  Check,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";

const userTypes = [
  {
    id: "student",
    title: "Student",
    icon: GraduationCap,
    description: "I want to learn and improve my knowledge",
    features: [
      "Upload and study from textbooks",
      "Get AI-powered tutoring",
      "Take quizzes and track progress",
      "Join study groups",
    ],

    gradient: "from-blue-500 to-blue-600",
    darkGradient: "dark:from-blue-600 dark:to-blue-700",
  },
  {
    id: "teacher",
    title: "Teacher",
    icon: Users,
    description: "I want to teach and manage classes",
    features: [
      "Create and manage classes",
      "Upload course materials",
      "Create AI-generated quizzes",
      "Track student performance",
    ],

    gradient: "from-[#99CE79] to-[#8BC865]",
    darkGradient: "dark:from-[#99CE79] dark:to-[#E2FED3]",
  },
  {
    id: "institution",
    title: "Institution",
    icon: Building2,
    description: "I represent a school or educational organization",
    features: [
      "Manage multiple teachers",
      "Oversee all classes",
      "Advanced analytics dashboard",
      "White-label options",
    ],

    gradient: "from-purple-500 to-purple-600",
    darkGradient: "dark:from-purple-600 dark:to-purple-700",
  },
];

export default function OnboardingPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useUser();

  const handleContinue = () => {
    if (selectedType) {
      // Store selection in localStorage temporarily
      localStorage.setItem("onboarding_user_type", selectedType);
      // Navigate to next step based on user type
      router.push(`/onboarding/${selectedType}`);
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      data-oid="8w4c.2q"
    >
      <div className="max-w-6xl w-full" data-oid="r5kb0yu">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
          data-oid="klw8i6f"
        >
          <div className="mb-6 flex justify-center" data-oid="rm2s:cc">
            <ThemeAwareLogo className="h-16 w-auto" />
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            data-oid="xq-nm_d"
          >
            Welcome to{" "}
            <span
              className="bg-gradient-to-r from-gray-700 to-gray-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
              data-oid="9ch1arg"
            >
              LearnByAi
            </span>
          </h1>
          <p
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
            data-oid=".bnzv8k"
          >
            Let's set up your account. First, tell us how you'll be using
            LearnByAi
          </p>
        </motion.div>

        {/* User Type Selection */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          data-oid="n3hr.c6"
        >
          {userTypes.map((type, index) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedType(type.id)}
              className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-300 ${
                selectedType === type.id
                  ? "border-[#99CE79] shadow-2xl scale-105 bg-gradient-to-b from-gray-50 to-white dark:from-[#99CE79]/10 dark:to-card"
                  : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-lg"
              }`}
              data-oid="qw:kmzn"
            >
              {/* Selected Checkmark */}
              {selectedType === type.id && (
                <div
                  className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-gradient-to-r from-[#99CE79] to-[#E2FED3] flex items-center justify-center shadow-lg"
                  data-oid="vaqniba"
                >
                  <Check className="h-5 w-5 text-gray-900" data-oid="ovo06-x" />
                </div>
              )}

              {/* Icon */}
              <div
                className={`h-16 w-16 rounded-xl bg-gradient-to-br ${type.gradient} ${type.darkGradient} flex items-center justify-center mb-4 mx-auto`}
                data-oid="lfjzicd"
              >
                <type.icon className="h-8 w-8 text-white" data-oid="g7klkws" />
              </div>

              {/* Title */}
              <h3
                className="text-xl font-bold text-center mb-2"
                data-oid="16vg-.9"
              >
                {type.title}
              </h3>

              {/* Description */}
              <p
                className="text-sm text-muted-foreground text-center mb-4"
                data-oid="wdr9f.y"
              >
                {type.description}
              </p>

              {/* Features */}
              <ul className="space-y-2" data-oid="ojyb_02">
                {type.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm"
                    data-oid="0zpxsq5"
                  >
                    <Check
                      className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5"
                      data-oid="gy8xole"
                    />

                    <span className="text-muted-foreground" data-oid="xxw_yv9">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
          data-oid="l6of71f"
        >
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selectedType}
            className="min-w-[200px] bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black dark:from-[#99CE79] dark:to-[#E2FED3] dark:hover:from-[#8BC865] dark:hover:to-[#D1F7C4] dark:text-gray-900 disabled:opacity-50"
            data-oid="eloig3m"
          >
            Continue
            <ArrowRight className="h-5 w-5 ml-2" data-oid="_stz1s2" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4" data-oid="ax:av4f">
            You can always change this later in settings
          </p>
        </motion.div>
      </div>
    </div>
  );
}

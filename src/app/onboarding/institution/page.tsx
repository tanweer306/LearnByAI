"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

const institutionTypes = [
  "K-12 School",
  "High School",
  "University/College",
  "Coaching Center",
  "Online Academy",
  "Corporate Training",
  "Other",
];

const institutionSizes = [
  "Small (1-100 students)",
  "Medium (100-500 students)",
  "Large (500-2000 students)",
  "Very Large (2000+ students)",
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

export default function InstitutionOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    institutionName: "",
    institutionType: "",
    institutionSize: "",
    contactPersonName: "",
    contactPersonTitle: "",
    phoneNumber: "",
    country: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    languagePreference: "en",
    numberOfTeachers: "",
    website: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: "institution",
          ...formData,
        }),
      });

      if (response.ok) {
        router.push("/dashboard/institution");
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
      data-oid="0uvgyk0"
    >
      <div className="max-w-3xl w-full" data-oid="x7w31-n">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
          data-oid="anda9.k"
        >
          <ThemeAwareLogo className="h-12 w-auto mx-auto mb-4" data-oid="dv3h7sm" />

          <h1
            className="text-3xl md:text-4xl font-bold mb-2"
            data-oid="s.dzf_7"
          >
            Institution{" "}
            <span
              className="bg-gradient-to-r from-gray-700 to-gray-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
              data-oid="b2_::68"
            >
              Setup
            </span>
          </h1>
          <p className="text-muted-foreground" data-oid="ns620zm">
            Help us understand your institution's needs
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="bg-card border-2 rounded-xl p-8 space-y-6"
          data-oid="xj5-hlx"
        >
          {/* Institution Name */}
          <div data-oid="hf-8_60">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="u0cy9:m"
            >
              Institution Name{" "}
              <span className="text-red-500" data-oid="f_y6jb:">
                *
              </span>
            </label>
            <input
              type="text"
              required
              value={formData.institutionName}
              onChange={(e) =>
                setFormData({ ...formData, institutionName: e.target.value })
              }
              placeholder="e.g., Springfield Academy"
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="46pujxf"
            />
          </div>

          {/* Institution Type */}
          <div data-oid="m2rthy7">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="w.idkw9"
            >
              Institution Type{" "}
              <span className="text-red-500" data-oid="mnd7pmy">
                *
              </span>
            </label>
            <select
              required
              value={formData.institutionType}
              onChange={(e) =>
                setFormData({ ...formData, institutionType: e.target.value })
              }
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="cwecdj7"
            >
              <option value="" data-oid="h6r8sc7">
                Select institution type
              </option>
              {institutionTypes.map((type) => (
                <option key={type} value={type} data-oid="wia1vj-">
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Institution Size */}
          <div data-oid="dgkbs7d">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="ykfmirp"
            >
              Institution Size{" "}
              <span className="text-red-500" data-oid="qfk-yuo">
                *
              </span>
            </label>
            <select
              required
              value={formData.institutionSize}
              onChange={(e) =>
                setFormData({ ...formData, institutionSize: e.target.value })
              }
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="u4juj23"
            >
              <option value="" data-oid="tr53ovc">
                Select institution size
              </option>
              {institutionSizes.map((size) => (
                <option key={size} value={size} data-oid="i31nidk">
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Person Details */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            data-oid="-qror:0"
          >
            <div data-oid="..4d6yp">
              <label
                className="block text-sm font-medium mb-2"
                data-oid="z84foov"
              >
                Contact Person Name{" "}
                <span className="text-red-500" data-oid="p2l1fc8">
                  *
                </span>
              </label>
              <input
                type="text"
                required
                value={formData.contactPersonName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactPersonName: e.target.value,
                  })
                }
                placeholder="Full name"
                className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
                data-oid="ijmtlq5"
              />
            </div>
            <div data-oid="h52svu7">
              <label
                className="block text-sm font-medium mb-2"
                data-oid="h8:xv0."
              >
                Title/Position
              </label>
              <input
                type="text"
                value={formData.contactPersonTitle}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactPersonTitle: e.target.value,
                  })
                }
                placeholder="e.g., Principal, Director"
                className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
                data-oid="t-sdh3h"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div data-oid="zhkvibq">
            <label
              className="block text-sm font-medium mb-2"
              data-oid=".v0fk0r"
            >
              Phone Number{" "}
              <span className="text-red-500" data-oid=".clvs5d">
                *
              </span>
            </label>
            <input
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
              placeholder="+1 (555) 123-4567"
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="d8orpef"
            />
          </div>

          {/* Number of Teachers */}
          <div data-oid="wg06snd">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="ojfhp6u"
            >
              Number of Teachers
            </label>
            <input
              type="number"
              min="1"
              value={formData.numberOfTeachers}
              onChange={(e) =>
                setFormData({ ...formData, numberOfTeachers: e.target.value })
              }
              placeholder="e.g., 25"
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="bqb4:er"
            />
          </div>

          {/* Country */}
          <div data-oid="6r2nqsv">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="kr9_jwg"
            >
              Country{" "}
              <span className="text-red-500" data-oid="v0nws_2">
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
              data-oid="-kqtjrk"
            >
              <option value="" data-oid="n74kbtw">
                Select country
              </option>
              {countries.map((country) => (
                <option key={country} value={country} data-oid="m4txy21">
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* Website */}
          <div data-oid="yozrei7">
            <label
              className="block text-sm font-medium mb-2"
              data-oid="3f8q9pz"
            >
              Website (Optional)
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
              placeholder="https://www.yourschool.edu"
              className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-[#99CE79] outline-none"
              data-oid="0e80ma."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4" data-oid="rc2f:z3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/onboarding")}
              className="flex-1"
              data-oid="j4ul0a."
            >
              <ArrowLeft className="h-4 w-4 mr-2" data-oid="b6i48jp" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.institutionName ||
                !formData.institutionType ||
                !formData.institutionSize ||
                !formData.contactPersonName ||
                !formData.phoneNumber ||
                !formData.country
              }
              className="flex-1 bg-gradient-to-r from-gray-700 to-gray-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900"
              data-oid="ygr89qk"
            >
              {loading ? (
                <>
                  <Loader2
                    className="h-4 w-4 mr-2 animate-spin"
                    data-oid="0mv.qqf"
                  />
                  Setting up...
                </>
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="h-4 w-4 ml-2" data-oid="lkgnijy" />
                </>
              )}
            </Button>
          </div>
        </motion.form>

        {/* Progress Indicator */}
        <div className="mt-6 text-center" data-oid="p-47obw">
          <div
            className="flex items-center justify-center gap-2"
            data-oid="oz2ai94"
          >
            <div
              className="h-2 w-2 rounded-full bg-[#99CE79]"
              data-oid="_xqgg:c"
            />

            <div
              className="h-2 w-16 rounded-full bg-[#99CE79]"
              data-oid="cp.w770"
            />

            <div
              className="h-2 w-2 rounded-full bg-[#99CE79]"
              data-oid="1pnicl0"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2" data-oid="su28ofm">
            Step 2 of 2
          </p>
        </div>
      </div>
    </div>
  );
}

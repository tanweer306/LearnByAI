"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Check, Menu, X } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ThemeAwareLogo } from "@/components/layout/ThemeAwareLogo";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background" data-oid="eb089fq">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        data-oid="vhlu97v"
      >
        <div
          className="container mx-auto px-4 sm:px-6 lg:px-8"
          data-oid="8fq2s9_"
        >
          <div
            className="flex h-16 items-center justify-between"
            data-oid="wst-h3o"
          >
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 group"
              data-oid="p9giffn"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center"
                data-oid="2vfup3m"
              >
                <ThemeAwareLogo className="h-12 w-auto" />
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <nav
              className="hidden md:flex items-center space-x-8"
              data-oid="snlofjm"
            >
              {[
                { name: "Features", href: "/#features" },
                { name: "Pricing", href: "/pricing" },
                { name: "Testimonials", href: "/#testimonials" },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                  data-oid="57t.d3n"
                >
                  {item.name}
                  <span
                    className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
                    data-oid="fnd.3zy"
                  />
                </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center space-x-4" data-oid="1tnwx_l">
              <ThemeToggle data-oid="zpk1d6_" />

              {/* Show when user is signed out */}
              <SignedOut data-oid="kjj7zpx">
                <Link
                  href="/sign-in"
                  className="hidden md:block"
                  data-oid=".mw7.p6"
                >
                  <Button variant="ghost" size="sm" data-oid="6w-t510">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up" data-oid="ucrprm9">
                  <Button
                    variant="gradient"
                    size="sm"
                    className="hidden md:flex"
                    data-oid="v.82xyk"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4" data-oid="jv4tzuk" />
                  </Button>
                </Link>
              </SignedOut>

              {/* Show when user is signed in */}
              <SignedIn data-oid="ran50rq">
                <Link
                  href="/dashboard"
                  className="hidden md:block"
                  data-oid="f59zdve"
                >
                  <Button variant="ghost" size="sm" data-oid="8y5wkk-">
                    Dashboard
                  </Button>
                </Link>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "h-9 w-9",
                    },
                  }}
                  data-oid="4g7f4tz"
                />
              </SignedIn>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-oid="f_t6sc1"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" data-oid="16c5:l0" />
                ) : (
                  <Menu className="h-5 w-5" data-oid="hyd3.:1" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t bg-background"
            data-oid="6zouldq"
          >
            <div
              className="container mx-auto px-4 py-6 space-y-4"
              data-oid="ix3stl-"
            >
              {["Features", "Pricing", "Testimonials"].map((item) => (
                <Link
                  key={item}
                  href={
                    item === "Pricing" ? "/pricing" : `/#${item.toLowerCase()}`
                  }
                  className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                  data-oid="88nb6jd"
                >
                  {item}
                </Link>
              ))}
              <div className="pt-4 border-t space-y-2" data-oid="s5yajm_">
                <Link href="/sign-in" className="block" data-oid="wshhl2v">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    data-oid="1xts9bb"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up" className="block" data-oid="84x5br-">
                  <Button
                    variant="gradient"
                    size="lg"
                    className="w-full"
                    data-oid="wol989c"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* Pricing Section */}
      <section className="py-20 md:py-32" data-oid="2rcxtnv">
        <div
          className="container mx-auto px-4 sm:px-6 lg:px-8"
          data-oid="4r79c53"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-12"
            data-oid="qn24xe2"
          >
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
              data-oid="xmrhejt"
            >
              Simple, Transparent{" "}
              <span
                className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
                data-oid="9lrq..:"
              >
                Pricing
              </span>
            </h1>
            <p className="text-lg text-muted-foreground" data-oid="k5qb57w">
              Choose the plan that's right for you
            </p>
          </motion.div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            data-oid="h01yz4n"
          >
            {[
              {
                name: "Student",
                price: "$5",
                period: "/month",
                features: [
                  "Upload up to 10 books",
                  "Unlimited AI questions",
                  "5 quizzes per month",
                  "Personalized study plans",
                  "Progress tracking",
                  "Mobile app access",
                ],
              },
              {
                name: "Teacher",
                price: "$15",
                period: "/month",
                popular: true,
                features: [
                  "Everything in Student",
                  "Upload up to 50 books",
                  "Unlimited classes",
                  "Up to 100 students",
                  "Unlimited quizzes",
                  "Student analytics",
                ],
              },
              {
                name: "School",
                price: "$100",
                period: "/month",
                features: [
                  "Everything in Teacher",
                  "Up to 200 students",
                  "5 teacher accounts",
                  "Admin dashboard",
                  "Advanced reporting",
                  "Priority support",
                ],
              },
            ].map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
                data-oid="39u.63l"
              >
                <div
                  className={`relative rounded-2xl border-2 ${
                    plan.popular
                      ? "border-indigo-600 shadow-2xl scale-105 bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/30 dark:to-card"
                      : "border-border bg-card hover:border-primary/50 hover:shadow-xl"
                  } p-8 transition-all duration-300`}
                  data-oid="nh6fu.9"
                >
                  {plan.popular && (
                    <div
                      className="absolute -top-4 left-1/2 transform -translate-x-1/2"
                      data-oid="1jx1i_f"
                    >
                      <span
                        className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1 text-sm font-medium text-white shadow-lg"
                        data-oid="fk4z0kv"
                      >
                        <Sparkles className="h-3 w-3 mr-1" data-oid="rtod092" />
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-6" data-oid="87slt60">
                    <h3
                      className="text-2xl font-bold mb-2 text-foreground"
                      data-oid="7abf135"
                    >
                      {plan.name}
                    </h3>
                    <div className="mb-4" data-oid="ouwku0h">
                      <span
                        className="text-4xl font-bold text-foreground"
                        data-oid="z:4fj6q"
                      >
                        {plan.price}
                      </span>
                      <span
                        className="text-muted-foreground"
                        data-oid="28en7kp"
                      >
                        {plan.period}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8" data-oid="f:0rwjh">
                    {plan.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3"
                        data-oid="myjv6t5"
                      >
                        <Check
                          className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5"
                          data-oid="20v01mp"
                        />

                        <span
                          className="text-sm text-foreground"
                          data-oid="u2ta1ng"
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/sign-up" data-oid="6eeo0:s">
                    <Button
                      variant={plan.popular ? "gradient" : "outline"}
                      size="lg"
                      className="w-full"
                      data-oid="6xrefy:"
                    >
                      Start Free Trial
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 text-center text-sm text-muted-foreground"
            data-oid="fticp49"
          >
            <p className="mb-4" data-oid="m60jsg.">
              All plans include:
            </p>
            <div
              className="flex flex-wrap justify-center gap-6"
              data-oid="9_85-7_"
            >
              {[
                "14-day free trial",
                "No credit card required",
                "Cancel anytime",
                "Email support",
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-2"
                  data-oid="2ljy:9q"
                >
                  <Check
                    className="h-4 w-4 text-green-500"
                    data-oid=".zsypvp"
                  />

                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50" data-oid="i8.xedo">
        <div
          className="container mx-auto px-4 sm:px-6 lg:px-8 py-12"
          data-oid="j0ylj_h"
        >
          <div
            className="flex flex-col md:flex-row justify-between items-center gap-6"
            data-oid="6gg8n1n"
          >
            <Link
              href="/"
              className="flex items-center"
              data-oid="khp97v9"
            >
              <ThemeAwareLogo className="h-10 w-auto" data-oid="y36zemg" />
            </Link>
            <p className="text-sm text-muted-foreground" data-oid="-73:dvl">
              © {new Date().getFullYear()} LearnByAi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

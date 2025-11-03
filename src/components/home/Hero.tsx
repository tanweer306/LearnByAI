"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Play,
  BookOpen,
  MessageSquare,
  Brain,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      data-oid="i5a:91_"
    >
      {/* Animated Background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 animate-gradient-x"
        data-oid="pk5ffi."
      />

      <div
        className="absolute inset-0 bg-grid-pattern opacity-[0.02]"
        data-oid="vaj35nc"
      />

      {/* Floating Orbs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl"
        animate={{
          y: [0, 30, 0],
          x: [0, 20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        data-oid="aphb-k1"
      />

      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
        animate={{
          y: [0, -40, 0],
          x: [0, -30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        data-oid="bbxov50"
      />

      <div
        className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-20"
        data-oid="u.53cx0"
      >
        <div
          className="grid lg:grid-cols-2 gap-12 items-center"
          data-oid="_c3qbxq"
        >
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center lg:text-left"
            data-oid="hikbscv"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              data-oid="m8xzg3p"
            >
              <Badge
                className="mb-6 text-sm px-4 py-1.5"
                variant="secondary"
                data-oid="7kr2z:p"
              >
                🚀 New: AI Study Plans Now Available
              </Badge>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              data-oid="9p2g5w2"
            >
              Transform Learning with{" "}
              <span
                className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent"
                data-oid="yscugxa"
              >
                AI-Powered Education
              </span>
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              data-oid="o_i:3s5"
            >
              Upload textbooks, get instant AI tutoring, create quizzes, and
              personalized study plans - all in one intelligent platform
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              data-oid="5fv2on2"
            >
              <Link href="/sign-up" data-oid="sxbz2f:">
                <Button
                  size="lg"
                  variant="default"
                  className="group bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                  data-oid="9l4mbbn"
                >
                  Start Free Trial
                  <ArrowRight
                    className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform"
                    data-oid="mbb-f:-"
                  />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="group"
                data-oid="u89pvzs"
              >
                <Play
                  className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform"
                  data-oid="5j9qvku"
                />
                Watch Demo
              </Button>
            </motion.div>

            <motion.p
              className="text-sm text-muted-foreground mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              data-oid="r_44fy7"
            >
              No credit card required • 14-day free trial
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-8 justify-center lg:justify-start text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              data-oid="9bid.fs"
            >
              <div className="flex items-center gap-2" data-oid="s-rcegz">
                <div
                  className="h-2 w-2 rounded-full bg-green-500 animate-pulse"
                  data-oid="shozn65"
                />

                <span className="font-semibold" data-oid="oonmvhl">
                  10K+ Students
                </span>
              </div>
              <div className="flex items-center gap-2" data-oid=".v-s4r4">
                <div
                  className="h-2 w-2 rounded-full bg-green-500 animate-pulse"
                  data-oid="hrwwd8n"
                />

                <span className="font-semibold" data-oid=".285zs.">
                  500+ Books
                </span>
              </div>
              <div className="flex items-center gap-2" data-oid="5ackcy.">
                <div
                  className="h-2 w-2 rounded-full bg-green-500 animate-pulse"
                  data-oid="31y54v7"
                />

                <span className="font-semibold" data-oid="hn8-_dg">
                  95% Success Rate
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Visual */}
          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            data-oid="562qalz"
          >
            <div className="relative" data-oid=".zruip.">
              {/* Main Card */}
              <motion.div
                className="relative z-10 rounded-2xl bg-card border shadow-2xl p-8"
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                data-oid="m1kq87_"
              >
                <div
                  className="flex items-center gap-3 mb-6"
                  data-oid="cykffkj"
                >
                  <div
                    className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center"
                    data-oid="ad7_xvc"
                  >
                    <Brain className="h-6 w-6 text-white" data-oid="1s4i6-9" />
                  </div>
                  <div data-oid="g.tx89k">
                    <h3 className="font-semibold" data-oid="rw41a_5">
                      AI Assistant
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid=":w4tq3:"
                    >
                      Always ready to help
                    </p>
                  </div>
                </div>
                <div className="space-y-4" data-oid="j5.0_q7">
                  <div className="flex gap-3" data-oid="ggs652s">
                    <MessageSquare
                      className="h-5 w-5 text-primary flex-shrink-0 mt-1"
                      data-oid="8cftcay"
                    />

                    <div data-oid="-grba9a">
                      <p
                        className="text-sm font-medium mb-1"
                        data-oid="jnbw:va"
                      >
                        Student Question
                      </p>
                      <p
                        className="text-sm text-muted-foreground"
                        data-oid="77-kdzh"
                      >
                        "Explain photosynthesis in simple terms"
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3" data-oid="gefpso:">
                    <Brain
                      className="h-5 w-5 text-purple-500 flex-shrink-0 mt-1"
                      data-oid="orhltd-"
                    />

                    <div data-oid="pub7o0:">
                      <p
                        className="text-sm font-medium mb-1"
                        data-oid="kn1kaoo"
                      >
                        AI Response
                      </p>
                      <p
                        className="text-sm text-muted-foreground"
                        data-oid="q27-leb"
                      >
                        "Photosynthesis is how plants make food using
                        sunlight..."
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Book Card */}
              <motion.div
                className="absolute -top-8 -left-8 rounded-xl bg-card border shadow-lg p-4 w-48"
                animate={{
                  y: [0, 15, 0],
                  rotate: [-2, 2, -2],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                data-oid="qbihclh"
              >
                <BookOpen
                  className="h-8 w-8 text-primary mb-2"
                  data-oid="ale00u:"
                />

                <p className="text-sm font-semibold" data-oid="hacvlv4">
                  Biology Textbook
                </p>
                <p className="text-xs text-muted-foreground" data-oid="7isd1m8">
                  Chapter 3: Plants
                </p>
              </motion.div>

              {/* Floating Quiz Card */}
              <motion.div
                className="absolute -bottom-8 -right-8 rounded-xl bg-card border shadow-lg p-4 w-48"
                animate={{
                  y: [0, -15, 0],
                  rotate: [2, -2, 2],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
                data-oid="uhm0vpf"
              >
                <div
                  className="flex items-center gap-2 mb-2"
                  data-oid="cx_oao:"
                >
                  <div
                    className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center"
                    data-oid="gci8jsz"
                  >
                    <span className="text-lg" data-oid="7oxdcar">
                      ✓
                    </span>
                  </div>
                  <div data-oid="a83c5g1">
                    <p className="text-sm font-semibold" data-oid="2-952ia">
                      Quiz Score
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      data-oid="mn5yhk9"
                    >
                      95% Complete
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          onClick={scrollToFeatures}
          data-oid="7zjd7au"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            data-oid="i4iwc8."
          >
            <ChevronDown
              className="h-8 w-8 text-muted-foreground"
              data-oid="il-11xl"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

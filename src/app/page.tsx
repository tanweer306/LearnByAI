"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  MessageSquare,
  Brain,
  Sparkles,
  Calendar,
  Globe,
  Users,
  BarChart3,
  Video,
  Building2,
  ClipboardList,
  Check,
  Star,
  ChevronDown,
  Menu,
  X,
  MessageCircle,
  Minimize2,
  Send,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ThemeAwareLogo } from "@/components/layout/ThemeAwareLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  quickActions?: { label: string; action: string }[];
  timestamp: Date;
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Chatbot state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [contactErrors, setContactErrors] = useState<{ [key: string]: string }>({});
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSubmitError, setContactSubmitError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  // Initialize chatbot
  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatOpen && !chatMinimized) {
      inputRef.current?.focus();
    }
  }, [chatOpen, chatMinimized]);

  useEffect(() => {
    if (chatOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: "👋 Hi! I'm the LearnByAI assistant. I can help you with:\n\n• Platform features\n• Pricing & plans\n• Getting started\n\nWhat would you like to explore?",
        quickActions: [
          { label: "💰 Pricing", action: "pricing" },
          { label: "🎓 Features", action: "features" },
          { label: "🚀 Free Trial", action: "trial" },
          { label: "📞 Contact Us", action: "contact" },
        ],
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [chatOpen]);

  const handleQuickAction = (action: string) => {
    let message = "";
    switch (action) {
      case "pricing":
        message = "What are your pricing plans?";
        break;
      case "features":
        message = "What features do you offer?";
        break;
      case "trial":
        message = "How do I start a free trial?";
        break;
      case "contact":
        setContactModalOpen(true);
        return;
      case "pricing_details":
        window.location.href = "/pricing";
        return;
      case "demo":
        window.open("https://youtube.com", "_blank");
        return;
      case "schedule_demo":
        window.location.href = "/contact";
        return;
      default:
        message = action;
    }
    handleSendMessage(message);
  };

  const resetContactForm = () => {
    setContactForm({ name: "", email: "", phone: "", message: "" });
    setContactErrors({});
    setContactSubmitted(false);
  };

  const validateContactForm = () => {
    const errors: { [key: string]: string } = {};
    if (!contactForm.name.trim()) errors.name = "Name is required";
    if (!contactForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      errors.email = "Enter a valid email";
    }
    if (!contactForm.phone.trim()) errors.phone = "Phone is required";
    if (!contactForm.message.trim()) errors.message = "Message is required";
    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContactSubmit = async () => {
    if (!validateContactForm()) return;
    setIsSendingContact(true);
    try {
      setContactSubmitError(null);
      const response = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          contact: {
            name: contactForm.name,
            email: contactForm.email,
            phone: contactForm.phone,
            message: contactForm.message,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send contact request");
      }

      setContactSubmitted(true);
      setTimeout(() => {
        setContactModalOpen(false);
        resetContactForm();
      }, 1200);
    } catch (error: any) {
      const message = error?.message || "Failed to send message. Please try again.";
      setContactSubmitError(message);
      setContactErrors({ form: message });
    } finally {
      setIsSendingContact(false);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = (messageText || inputValue).trim();
    if (!text || isTyping) return;

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      activeSessionId = generateSessionId();
      setSessionId(activeSessionId);
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, sessionId: activeSessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: data.response,
        quickActions: data.quickActions,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (error: any) {
      const fallbackText =
        error?.message && typeof error.message === "string"
          ? `I'm having trouble replying right now (${error.message}). Please try again shortly or reach out to support@learnbyai.app.`
          : "I'm having trouble replying right now. Please try again shortly or reach out to support@learnbyai.app.";

      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: fallbackText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-oid=":ie:yid">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        data-oid="lak3a3b"
      >
        <div
          className="container mx-auto px-4 sm:px-6 lg:px-8"
          data-oid="8imr2ah"
        >
          <div
            className="flex h-16 items-center justify-between"
            data-oid="gtd0bn6"
          >
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 group"
              data-oid="fw.n0r9"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center"
                data-oid="oc0zm4c"
              >
                <ThemeAwareLogo className="h-12 w-auto" data-oid="8tmcbtl" />
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <nav
              className="hidden md:flex items-center space-x-8"
              data-oid="39:2569"
            >
              {[
                { name: "Features", href: "#features" },
                { name: "Pricing", href: "/pricing" },
                { name: "Testimonials", href: "#testimonials" },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                  data-oid="uno6xs9"
                >
                  {item.name}
                  <span
                    className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
                    data-oid="ay2z_i1"
                  />
                </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center space-x-4" data-oid="avkwupn">
              <ThemeToggle data-oid="vf9mfdw" />

              {/* Show when user is signed out */}
              <SignedOut data-oid="5c78v0n">
                <Link
                  href="/sign-in"
                  className="hidden md:block"
                  data-oid="f5782qc"
                >
                  <Button variant="ghost" size="sm" data-oid="hvhy:gs">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up" data-oid="q0-jkq1">
                  <Button
                    size="sm"
                    className="hidden md:flex bg-gradient-to-r from-[#4F9F4A] via-[#7EC26C] to-[#E2FED3] text-gray-900 hover:from-[#26572C] hover:via-[#3F8B46] hover:to-[#7EC26C]"
                    data-oid="cf..n5f"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4" data-oid="eq_pr-v" />
                  </Button>
                </Link>
              </SignedOut>

              {/* Show when user is signed in */}
              <SignedIn data-oid="4680o0h">
                <Link
                  href="/dashboard"
                  className="hidden md:block"
                  data-oid="0wiuw.3"
                >
                  <Button variant="ghost" size="sm" data-oid="nd4ligk">
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
                  data-oid="cjplwh0"
                />
              </SignedIn>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-oid="d6ulqb5"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" data-oid="7ou3j2w" />
                ) : (
                  <Menu className="h-5 w-5" data-oid="2:myk0m" />
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
            data-oid="qal5-ni"
          >
            <div
              className="container mx-auto px-4 py-6 space-y-4"
              data-oid="5ko61ks"
            >
              <Link
                href="#features"
                className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-oid="8fqk:r."
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-oid="_-g:kca"
              >
                Pricing
              </Link>
              <Link
                href="#testimonials"
                className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-oid="uuqc1rg"
              >
                Testimonials
              </Link>
              <div className="pt-4 border-t space-y-2" data-oid="ld6m.ow">
                {/* Show when user is signed out */}
                <SignedOut data-oid="-pok4cq">
                  <Link href="/sign-in" className="block" data-oid="z6_-6ys">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      data-oid="8krxkcs"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/sign-up" className="block" data-oid="i2-fmqn">
                    <Button
                      variant="gradient"
                      size="lg"
                      className="w-full bg-gradient-to-r from-[#4F9F4A] via-[#7EC26C] to-[#E2FED3] text-gray-900 hover:from-[#26572C] hover:via-[#3F8B46] hover:to-[#7EC26C]"
                      data-oid="j.5--8a"
                    >
                      Get Started
                    </Button>
                  </Link>
                </SignedOut>

                {/* Show when user is signed in */}
                <SignedIn data-oid="ifj8pii">
                  <Link href="/dashboard" className="block" data-oid="jq5yn4u">
                    <Button
                      variant="gradient"
                      size="lg"
                      className="w-full"
                      data-oid="m0f:740"
                    >
                      Go to Dashboard
                    </Button>
                  </Link>
                  <div
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    data-oid="dhs53fa"
                  >
                    <span className="text-sm font-medium" data-oid="tkxcwr:">
                      Your Account
                    </span>
                    <UserButton
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          avatarBox: "h-10 w-10",
                        },
                      }}
                      data-oid="g55laly"
                    />
                  </div>
                </SignedIn>
              </div>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden" data-oid="1025i92">
        {/* Animated Background - Grey & White theme */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-white dark:from-[#0a0d14] dark:via-[#121826] dark:to-[#0a0d14]"
          data-oid="61wi5u1"
          key="olk-99kI"
        />

        {/* Floating Orbs - Grey tones */}
        <motion.div
          animate={{
            y: [0, 30, 0],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 left-10 w-72 h-72 bg-gray-400/20 dark:bg-gray-600/10 rounded-full blur-3xl"
          data-oid="mxst9ro"
          key="olk-jFtC"
        />

        <motion.div
          animate={{
            y: [0, -40, 0],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-20 right-10 w-96 h-96 bg-gray-300/20 dark:bg-gray-700/10 rounded-full blur-3xl"
          data-oid="74s.v.p"
          key="olk-fZN4"
        />

        <div
          className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32"
          data-oid="vazcp-z"
          key="olk-R9hc"
        >
          <div
            className="grid lg:grid-cols-2 gap-12 items-center"
            data-oid="ecub68s"
          >
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center lg:text-left"
              data-oid="tgvvkys"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800/50 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-6 border border-gray-200 dark:border-gray-700"
                data-oid="2lw__yq"
              >
                🚀 New: AI Study Plans Now Available
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight"
                data-oid="uq.xn:6"
              >
                Transform Learning with{" "}
                <span
                  className="bg-gradient-to-r from-purple-700 via-purple-600 to-purple-500 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
                  data-oid="bk4415f"
                >
                  AI-Powered Education
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0"
                data-oid="9oc4va8"
              >
                Upload textbooks, get instant AI tutoring, create quizzes, and
                personalized study plans - all in one intelligent platform
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8"
                data-oid="1re46r6"
              >
                <Link href="/sign-up" data-oid="z2y3ih3">
                  <Button
                    variant="gradient"
                    size="xl"
                    className="group w-full sm:w-auto bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black dark:from-gray-300 dark:to-gray-100 dark:hover:from-gray-200 dark:hover:to-white dark:text-gray-900"
                    data-oid="pbkt7nh"
                  >
                    Start Free Trial
                    <ArrowRight
                      className="h-5 w-5 group-hover:translate-x-1 transition-transform"
                      data-oid="71sw7:y"
                    />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="xl"
                  className="w-full sm:w-auto group"
                  data-oid="_taq1b2"
                >
                  <span className="mr-2" data-oid="s0hqlqj">
                    ▶
                  </span>{" "}
                  Watch Demo
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-sm text-muted-foreground mb-8"
                data-oid="ts5zeby"
              >
                No credit card required • 14-day free trial
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex flex-wrap gap-6 sm:gap-8 justify-center lg:justify-start text-sm font-semibold"
                data-oid="k-p7mj-"
              >
                {["10K Students", "500 Books", "95% Success"].map((stat) => (
                  <div
                    key={stat}
                    className="flex items-center gap-2"
                    data-oid="-gpi5is"
                  >
                    <div
                      className="h-2 w-2 rounded-full bg-green-500 animate-pulse"
                      data-oid="iauge:a"
                    />

                    <span data-oid="44y557.">{stat}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Column - 3D Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="relative hidden lg:block"
              data-oid="_5l:_9e"
            >
              <div className="relative" data-oid="qy86fo-">
                {/* Main Card */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative z-10 rounded-2xl bg-card border-2 border-gray-200 dark:border-gray-700 shadow-2xl p-8 backdrop-blur"
                  data-oid="11i1i9:"
                >
                  <div
                    className="flex items-center gap-3 mb-6"
                    data-oid="bhwl_te"
                  >
                    <div
                      className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 flex items-center justify-center"
                      data-oid="fb-2qev"
                    >
                      <Brain
                        className="h-6 w-6 text-white"
                        data-oid="z77nmb:"
                      />
                    </div>
                    <div data-oid="hu.3fcr">
                      <h3
                        className="font-semibold text-foreground"
                        data-oid="m674z4."
                      >
                        AI Assistant
                      </h3>
                      <p
                        className="text-sm text-muted-foreground"
                        data-oid="4bu05_q"
                      >
                        Always ready to help
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4" data-oid="_dqo1om">
                    <div className="flex gap-3" data-oid="4zgq_am">
                      <MessageSquare
                        className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-1"
                        data-oid="ap6gvji"
                      />

                      <div data-oid="7f5z2hc">
                        <p
                          className="text-sm font-medium mb-1 text-foreground"
                          data-oid="906jic4"
                        >
                          Student Question
                        </p>
                        <p
                          className="text-sm text-muted-foreground"
                          data-oid="wtj3wyg"
                        >
                          "Explain photosynthesis in simple terms"
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3" data-oid="0e_nva8">
                      <Brain
                        className="h-5 w-5 text-gray-700 dark:text-gray-300 flex-shrink-0 mt-1"
                        data-oid="icawjq1"
                      />

                      <div data-oid="i:b7n2:">
                        <p
                          className="text-sm font-medium mb-1 text-foreground"
                          data-oid="_pupwz2"
                        >
                          AI Response
                        </p>
                        <p
                          className="text-sm text-muted-foreground"
                          data-oid="fws77zd"
                        >
                          "Photosynthesis is how plants make food..."
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Cards */}
                <motion.div
                  animate={{ y: [0, 15, 0], rotate: [-2, 2, -2] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -top-8 -left-8 rounded-xl bg-card border-2 border-gray-200 dark:border-gray-700 shadow-lg p-4 w-48 backdrop-blur"
                  data-oid="srsx7o_"
                >
                  <BookOpen
                    className="h-8 w-8 text-gray-600 dark:text-gray-400 mb-2"
                    data-oid="4w:c2eb"
                  />

                  <p
                    className="text-sm font-semibold text-foreground"
                    data-oid="ughtge5"
                  >
                    Biology Textbook
                  </p>
                  <p
                    className="text-xs text-muted-foreground"
                    data-oid="5.khuj7"
                  >
                    Chapter 3: Plants
                  </p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -15, 0], rotate: [2, -2, 2] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                  className="absolute -bottom-8 -right-8 rounded-xl bg-card border-2 border-gray-200 dark:border-gray-700 shadow-lg p-4 w-48 backdrop-blur"
                  data-oid="xdq38jq"
                >
                  <div
                    className="flex items-center gap-2 mb-2"
                    data-oid="z-091t:"
                  >
                    <div
                      className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center"
                      data-oid="hsy7ovn"
                    >
                      <Check
                        className="h-5 w-5 text-green-600"
                        data-oid="ekg9ofp"
                      />
                    </div>
                    <div data-oid="rf80bti">
                      <p
                        className="text-sm font-semibold text-foreground"
                        data-oid="1g55eq7"
                      >
                        Quiz Score
                      </p>
                      <p
                        className="text-xs text-muted-foreground"
                        data-oid="-e-bnz1"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer"
            onClick={() =>
              document
                .getElementById("features")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            data-oid="lwmhjff"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              data-oid="ajd9-.y"
            >
              <ChevronDown
                className="h-8 w-8 text-muted-foreground"
                data-oid="2mdwds1"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section
        className="py-12 md:py-16 bg-gradient-to-r from-gray-100 via-gray-50 to-white dark:from-gray-900/50 dark:via-gray-800/50 dark:to-gray-900/50"
        data-oid="ghgpiip"
      >
        <div
          className="container mx-auto px-4 sm:px-6 lg:px-8"
          data-oid="qeza4ld"
        >
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            data-oid="1.c-ijv"
          >
            {[
              { value: "10,000", label: "Active Students" },
              { value: "500", label: "Books Uploaded" },
              { value: "95%", label: "Success Rate" },
              { value: "24/7", label: "AI Availability" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
                data-oid="4i3dn6e"
              >
                <div
                  className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-800 to-purple-600 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text mb-2"
                  data-oid="znqstw:"
                >
                  {stat.value}
                </div>
                <div
                  className="text-sm md:text-base text-muted-foreground font-medium"
                  data-oid="xd:iv-8"
                >
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32" data-oid="--za3dl">
        <div
          className="container mx-auto px-4 sm:px-6 lg:px-8"
          data-oid="tovo-o-"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
            data-oid="8k6ppj."
          >
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
              data-oid="6e5feru"
            >
              Powerful Features for{" "}
              <span
                className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
                data-oid="fyz3n2x"
              >
                Modern Learning
              </span>
            </h2>
            <p className="text-lg text-muted-foreground" data-oid="eec.3bb">
              Everything you need to succeed, powered by cutting-edge AI
              technology
            </p>
          </motion.div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
            data-oid="836nsxe"
          >
            {[
              {
                icon: BookOpen,
                title: "Smart Book Management",
                description:
                  "Upload PDFs with automatic duplicate detection and chapter-based organization",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                icon: MessageSquare,
                title: "AI-Powered Q&A",
                description:
                  "Ask any question and get instant, accurate answers sourced from your textbooks",
                gradient: "from-purple-500 to-pink-500",
              },
              {
                icon: ClipboardList,
                title: "Auto-Generated Quizzes",
                description:
                  "Create custom quizzes from any chapter with AI grading and instant feedback",
                gradient: "from-green-500 to-emerald-500",
              },
              {
                icon: Calendar,
                title: "Personalized Study Plans",
                description:
                  "AI analyzes your goals and creates optimized study schedules",
                gradient: "from-orange-500 to-red-500",
              },
              {
                icon: Globe,
                title: "Multilingual Support",
                description:
                  "Learn in 50+ languages with real-time translation",
                gradient: "from-indigo-500 to-purple-500",
              },
              {
                icon: Users,
                title: "Class Management",
                description:
                  "Create classes, share content, and track student progress",
                gradient: "from-pink-500 to-rose-500",
              },
              {
                icon: BarChart3,
                title: "Advanced Analytics",
                description:
                  "Detailed insights into learning patterns and areas for improvement",
                gradient: "from-yellow-500 to-orange-500",
              },
              {
                icon: Video,
                title: "Live Video Teaching",
                description:
                  "Integrated video conferencing with screen sharing capabilities",
                gradient: "from-cyan-500 to-blue-500",
              },
              {
                icon: Building2,
                title: "School Dashboard",
                description:
                  "Comprehensive admin tools for managing multiple classes",
                gradient: "from-violet-500 to-purple-500",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="group relative rounded-2xl border-2 border-border bg-card/50 dark:bg-card/80 backdrop-blur-sm p-6 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 overflow-hidden"
                data-oid="hy1k916"
              >
                {/* Blending overlay for dark mode */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 dark:opacity-5 group-hover:opacity-10 dark:group-hover:opacity-15 transition-opacity duration-300 mix-blend-overlay`}
                  data-oid="un4-shf"
                />

                <div className="relative z-10" data-oid="gu4g4k2">
                  <div
                    className={`h-14 w-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                    data-oid="y.p6aa7"
                  >
                    <feature.icon
                      className="h-7 w-7 text-white"
                      data-oid="rqkd5:-"
                    />
                  </div>
                  <h3
                    className="text-xl font-semibold mb-2 text-foreground"
                    data-oid="w3.bkxc"
                  >
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground" data-oid="fcfwx.n">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-32" data-oid="244bu3c">
        <div
          className="container mx-auto px-4 sm:px-6 lg:px-8"
          data-oid="r-w2jw4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
            data-oid="474g78:"
          >
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
              data-oid="zudfjge"
            >
              Loved by{" "}
              <span
                className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
                data-oid="kd-fk28"
              >
                Students & Teachers
              </span>
            </h2>
            <p className="text-lg text-muted-foreground" data-oid="ehzy:iy">
              See what our users are saying
            </p>
          </motion.div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            data-oid="mfbqnjs"
          >
            {[
              {
                name: "Sarah Johnson",
                role: "High School Student",
                content:
                  "This app transformed how I study! I went from C's to A's in just one semester.",
                avatar: "SJ",
              },
              {
                name: "Michael Chen",
                role: "AP Physics Teacher",
                content:
                  "Game-changer for my classroom. I save 10+ hours weekly on quiz creation.",
                avatar: "MC",
              },
              {
                name: "Dr. Emily Rodriguez",
                role: "Principal",
                content:
                  "We implemented this across 8 schools with 2,000+ students. Incredible results!",
                avatar: "ER",
              },
            ].map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="rounded-2xl border-2 border-border bg-card/50 dark:bg-card/80 backdrop-blur-sm p-6 hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                data-oid="y7_mymk"
              >
                <div className="flex gap-1 mb-4" data-oid="7fbuadx">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-500 text-yellow-500"
                      data-oid="9:0kfe1"
                    />
                  ))}
                </div>
                <p
                  className="text-muted-foreground mb-6 italic"
                  data-oid="q_:ax-6"
                >
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3" data-oid="z5t7b2i">
                  <div
                    className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-500 dark:to-gray-700 flex items-center justify-center text-white font-semibold"
                    data-oid="ozb1hhz"
                  >
                    {testimonial.avatar}
                  </div>
                  <div data-oid="8igut8u">
                    <p
                      className="font-semibold text-foreground"
                      data-oid="ahzyqha"
                    >
                      {testimonial.name}
                    </p>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid="1ystp:r"
                    >
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-20 md:py-32 relative overflow-hidden"
        data-oid="3mvuhe6"
      >
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-black"
          data-oid="mud.206"
        />

        <div className="absolute inset-0 bg-grid-white/10" data-oid="swww.9i" />

        <motion.div
          animate={{
            y: [0, 50, 0],
            x: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          data-oid="cvtp9m9"
        />

        <div
          className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center"
          data-oid="h7yc1f2"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            data-oid=".ul1gtg"
          >
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
              data-oid="lkbftsa"
            >
              Ready to Transform Your Learning?
            </h2>
            <p
              className="text-xl text-white/90 mb-8 max-w-2xl mx-auto"
              data-oid="ynbk8y2"
            >
              Join 10,000 students and teachers already using AI to excel
            </p>
            <div
              className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
              data-oid="toeyhhr"
            >
              <Link href="/sign-up" data-oid="e6bfr5.">
                <Button
                  size="xl"
                  className="bg-white text-gray-900 hover:bg-gray-100 shadow-2xl hover:scale-105 transition-all"
                  data-oid="sih28m2"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" data-oid="3_l-4vu" />
                </Button>
              </Link>
            </div>
            <div
              className="flex flex-wrap justify-center gap-6 text-sm text-white/80"
              data-oid="eocjjls"
            >
              {[
                "14-day free trial",
                "No credit card",
                "Cancel anytime",
                "24/7 support",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2"
                  data-oid="sskkakc"
                >
                  <Check className="h-4 w-4" data-oid="25ns9kg" />
                  <span data-oid="drti5d:">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50" data-oid="-r:y:o_">
        <div
          className="container mx-auto px-4 sm:px-6 lg:px-8 py-12"
          data-oid="j1kaag9"
        >
          <div
            className="flex flex-col md:flex-row justify-between items-center gap-6"
            data-oid="o3.q_za"
          >
            <Link href="/" className="flex items-center" data-oid="e3ywku3">
              <ThemeAwareLogo className="h-10 w-auto" data-oid="vcvsizy" />
            </Link>
            <p className="text-sm text-muted-foreground" data-oid="yzcoao-">
              © {new Date().getFullYear()} LearnByAi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Chatbot Widget */}
      {!chatOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="fixed bottom-5 right-5 z-50"
        >
          <motion.button
            onClick={() => { setChatOpen(true); setHasInteracted(true); }}
            className="relative h-14 w-14 rounded-full bg-gradient-to-r from-[#4F9F4A] via-[#7EC26C] to-[#E2FED3] text-gray-900 shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={!hasInteracted ? { scale: [1, 1.1, 1] } : {}}
            transition={!hasInteracted ? { repeat: Infinity, duration: 2 } : {}}
          >
            <MessageCircle className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            {!hasInteracted && (
              <span className="absolute inset-0 rounded-full bg-[#99CE79] animate-ping opacity-60" />
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Contact Modal Overlay */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-[#A7D7A2] relative">
            <button
              onClick={() => {
                setContactModalOpen(false);
                resetContactForm();
              }}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#2F6B36] via-[#4F9F4A] to-[#99CE79] flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">Contact LearnByAI</h3>
                <p className="text-sm text-muted-foreground">
                  Share a few details and we’ll follow up within one business day.
                </p>
              </div>
            </div>

            {contactErrors.form && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {contactErrors.form}
              </div>
            )}
            {contactSubmitError && !contactErrors.form && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {contactSubmitError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <Input
                  value={contactForm.name}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Jane Doe"
                />
                {contactErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{contactErrors.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <Input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="jane@company.com"
                />
                {contactErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{contactErrors.email}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <Input
                  value={contactForm.phone}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 000-1234"
                />
                {contactErrors.phone && (
                  <p className="mt-1 text-xs text-red-600">{contactErrors.phone}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell us how we can help..."
                  className="mt-1 h-28 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F9F4A]"
                />
                {contactErrors.message && (
                  <p className="mt-1 text-xs text-red-600">{contactErrors.message}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              {contactSubmitted && (
                <span className="text-sm text-[#2F6B36] font-semibold">
                  Thanks! We’ll contact you soon.
                </span>
              )}
              <Button
                onClick={handleContactSubmit}
                disabled={isSendingContact}
                className="ml-auto bg-gradient-to-r from-[#2F6B36] via-[#4F9F4A] to-[#8FCC71] text-white hover:from-[#26572C] hover:via-[#3F8B46] hover:to-[#7EC26C]"
              >
                {isSendingContact ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {chatOpen && !chatMinimized && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-5 right-5 z-50 w-[380px] h-[600px] max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#A7D7A2] dark:border-gray-800 max-md:w-full max-md:h-full max-md:max-h-full max-md:bottom-0 max-md:right-0 max-md:rounded-none"
        >
          <div className="bg-gradient-to-r from-[#2F6B36] via-[#4F9F4A] to-[#99CE79] text-white p-4 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center overflow-hidden">
                <Image
                  src="/chatbot-logo.png"
                  alt="LearnByAI assistant"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div>
                <h3 className="font-semibold text-lg">LearnByAI</h3>
                <div className="flex items-center gap-1 text-xs text-white/90">
                  <span className="h-2 w-2 rounded-full bg-[#E2FED3] animate-pulse" />
                  <span>Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setChatMinimized(true)} className="h-8 w-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors max-md:hidden">
                <Minimize2 className="h-4 w-4" />
              </button>
              <button onClick={() => setChatOpen(false)} className="h-8 w-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-gradient-to-r from-[#2F6B36] via-[#4F9F4A] to-[#8FCC71] text-white" : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-[#C6EAC2] dark:border-gray-700"}`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  {message.quickActions && message.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {message.quickActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickAction(action.action)}
                          className="px-3 py-1.5 text-xs rounded-full bg-[#E2FED3] text-[#1B4332] hover:bg-[#CFF3C8] transition-colors border border-[#99CE79]"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs opacity-60 mt-2">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <div className="flex gap-2">
              <Input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Ask me anything..." disabled={isTyping} className="flex-1" />
              <Button onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isTyping} size="icon" className="bg-gradient-to-r from-[#2F6B36] via-[#4F9F4A] to-[#8FCC71] text-white hover:from-[#26572C] hover:via-[#3F8B46] hover:to-[#7EC26C]">
                {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Powered by AI • Available 24/7</p>
          </div>
        </motion.div>
      )}

      {chatOpen && chatMinimized && (
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="fixed bottom-5 right-5 z-50">
          <button onClick={() => setChatMinimized(false)} className="h-14 px-4 rounded-full bg-gradient-to-r from-[#4F9F4A] via-[#7EC26C] to-[#E2FED3] text-gray-900 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">LearnByAI</span>
            {messages.length > 1 && (
              <span className="h-5 w-5 rounded-full bg-[#1B4332] text-white text-xs flex items-center justify-center">
                {messages.filter(m => m.role === "assistant").length}
              </span>
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}

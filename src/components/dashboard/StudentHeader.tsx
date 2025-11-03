"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ThemeAwareLogo } from "@/components/layout/ThemeAwareLogo";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  MessageSquare,
  Calendar,
  BarChart3,
  Home,
  Menu,
  X,
  Video,
  FileText,
} from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/notifications/NotificationBell";

interface StudentHeaderProps {
  userName: string;
}

export default function StudentHeader({ userName }: StudentHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/dashboard/student", icon: Home },
    { name: "My Books", href: "/dashboard/books", icon: BookOpen },
    { name: "Assignments", href: "/dashboard/student/assignments", icon: FileText },
    { name: "Live Classes", href: "/dashboard/student/live-classes", icon: Video },
    { name: "Quizzes", href: "/dashboard/quiz", icon: Calendar },
    { name: "Analytics", href: "/dashboard/student/analytics", icon: BarChart3 },
  ];

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      data-oid="7bzjspw"
    >
      <div
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        data-oid="jm1tj2e"
      >
        <div
          className="flex h-16 items-center justify-between"
          data-oid="m7fl-gg"
        >
          {/* Logo */}
          <Link
            href="/dashboard/student"
            className="flex items-center gap-2"
            data-oid="vufyszm"
          >
            <ThemeAwareLogo className="h-10 w-auto" data-oid="mn502sj" />
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center space-x-1"
            data-oid="y4crw79"
          >
            {navItems.map((item) => (
              <Link key={item.name} href={item.href} data-oid="suy7:pv">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                  data-oid="ha5aj5p"
                >
                  <item.icon className="h-4 w-4" data-oid=".v6xx86" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3" data-oid="d:s9vum">
            <NotificationBell />
            <ThemeToggle data-oid="3dg46az" />
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
              data-oid="ypzar4o"
            />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-oid="b7ktxey"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" data-oid="9.pu586" />
              ) : (
                <Menu className="h-5 w-5" data-oid="fxlafmf" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4" data-oid="muh4gqv">
            <nav className="flex flex-col space-y-2" data-oid="ddja:l0">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  data-oid="bhuk-bz"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start flex items-center gap-2"
                    data-oid="0c8q0jt"
                  >
                    <item.icon className="h-4 w-4" data-oid="zi56_aj" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

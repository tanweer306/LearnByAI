"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ThemeAwareLogo } from "@/components/layout/ThemeAwareLogo";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  ClipboardList,
  BarChart3,
  Home,
  Menu,
  X,
  Link2,
  Brain,
  Video,
} from "lucide-react";
import { useState } from "react";

interface TeacherHeaderProps {
  userName?: string;
}

export default function TeacherHeader({ userName }: TeacherHeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/dashboard/teacher", icon: Home },
    { name: "My Classes", href: "/dashboard/teacher/classes", icon: Users },
    { name: "Live Sessions", href: "/dashboard/teacher/live-sessions", icon: Video },
    { name: "My Books", href: "/dashboard/books", icon: BookOpen },
    { name: "Assignments", href: "/dashboard/teacher/assignments", icon: ClipboardList },
    { name: "Referral Links", href: "/dashboard/referral/manage", icon: Link2 },
    { name: "Analytics", href: "/dashboard/teacher/analytics", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard/teacher" className="flex items-center gap-2">
            <ThemeAwareLogo className="h-10 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
            />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start flex items-center gap-2"
                  >
                    <item.icon className="h-4 w-4" />
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

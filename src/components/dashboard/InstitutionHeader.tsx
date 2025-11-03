"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ThemeAwareLogo } from "@/components/layout/ThemeAwareLogo";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  BarChart3,
  Settings,
  Home,
  Menu,
  X,
  Bell,
  BookOpen,
} from "lucide-react";
import { useState } from "react";

interface InstitutionHeaderProps {
  userName: string;
}

export default function InstitutionHeader({
  userName,
}: InstitutionHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/dashboard/institution", icon: Home },
    { name: "Teachers", href: "/dashboard/institution/teachers", icon: Users },
    {
      name: "Classes",
      href: "/dashboard/institution/classes",
      icon: Building2,
    },
    { name: "Materials", href: "/dashboard/books", icon: BookOpen },
    {
      name: "Analytics",
      href: "/dashboard/institution/analytics",
      icon: BarChart3,
    },
    {
      name: "Settings",
      href: "/dashboard/institution/settings",
      icon: Settings,
    },
  ];

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      data-oid="lxw1o8u"
    >
      <div
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        data-oid="est18hd"
      >
        <div
          className="flex h-16 items-center justify-between"
          data-oid="i9_.9dw"
        >
          {/* Logo */}
          <Link
            href="/dashboard/institution"
            className="flex items-center gap-2"
            data-oid="f8ap2pi"
          >
            <ThemeAwareLogo className="h-10 w-auto" data-oid="612e0:8" />
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center space-x-1"
            data-oid="7dcjv3g"
          >
            {navItems.map((item) => (
              <Link key={item.name} href={item.href} data-oid="ni6e7z.">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                  data-oid="ox-td.:"
                >
                  <item.icon className="h-4 w-4" data-oid="7m.beo7" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3" data-oid="f6wkj7y">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              data-oid="wkqu3_-"
            >
              <Bell className="h-5 w-5" data-oid="u.v115t" />
              <span
                className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"
                data-oid="gh0bo.0"
              />
            </Button>
            <ThemeToggle data-oid="qa1mszz" />
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
              data-oid="-ysoy-4"
            />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-oid="bj74ikl"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" data-oid="6tn5epj" />
              ) : (
                <Menu className="h-5 w-5" data-oid="k7nyzrl" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4" data-oid="oc7hj_l">
            <nav className="flex flex-col space-y-2" data-oid="uknrik6">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  data-oid="o7y09x_"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start flex items-center gap-2"
                    data-oid="_5g:_kd"
                  >
                    <item.icon className="h-4 w-4" data-oid="rzauo:q" />
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

"use client";

import { ChefHat, ClipboardList, LogIn, Menu, PenLine, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/auth";
import { canManageRecipes } from "@/lib/recipe-dashboard";

const links = [
  { href: "/", label: "Trang chủ" },
  { href: "/recipes", label: "Công thức" },
  { href: "/categories", label: "Danh mục" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const showRecipeDashboard = canManageRecipes(session?.user.role);
  const isAdmin = session?.user.role === 'Admin';

  // Link "/" chỉ active khi đúng trang chủ; các link khác active cả trang con.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6 lg:grid-cols-[auto_1fr_auto]">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ChefHat className="h-5 w-5" />
          </span>
          <span className="truncate font-display text-lg font-semibold tracking-tight">
            Culinary Blog
          </span>
        </Link>

        <nav className="hidden items-center gap-1 justify-self-center lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-foreground ${
                isActive(l.href) ? "bg-primary-soft text-foreground" : "text-muted-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {showRecipeDashboard && (
            <Link
              href="/dashboard/recipes"
              aria-current={isActive("/dashboard/recipes") ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-foreground ${
                isActive("/dashboard/recipes") ? "bg-primary-soft text-foreground" : "text-muted-foreground"
              }`}
            >
              <ClipboardList className="h-4 w-4" aria-hidden />
              Quản lý công thức
            </Link>
          )}
          {isAdmin && (
            <Link href="/dashboard/users" aria-current={isActive('/dashboard/users') ? 'page' : undefined} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-foreground ${isActive('/dashboard/users') ? 'bg-primary-soft text-foreground' : 'text-muted-foreground'}`}><Users className="h-4 w-4" aria-hidden />Người dùng</Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <form onSubmit={submitSearch} className="relative hidden md:block" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm công thức…"
              aria-label="Tìm công thức"
              className="field w-52 pl-9 lg:w-64"
            />
          </form>

          <Link
            href="/dashboard/recipes/new"
            className="hidden items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 sm:inline-flex"
          >
            <PenLine className="h-4 w-4" />
            Viết công thức
          </Link>

          <Link
            href="/login"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Đăng nhập</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Mở menu điều hướng"
            aria-expanded={open}
            className="grid h-11 w-11 place-items-center rounded-full border border-border lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-3 lg:hidden">
          <form onSubmit={submitSearch} className="relative mb-3 md:hidden" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm công thức…"
              aria-label="Tìm công thức"
              className="field pl-9"
            />
          </form>
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(l.href) ? "page" : undefined}
                className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            {showRecipeDashboard && (
              <Link
                href="/dashboard/recipes"
                onClick={() => setOpen(false)}
                aria-current={isActive("/dashboard/recipes") ? "page" : undefined}
                className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Quản lý công thức
              </Link>
            )}
            {isAdmin && <Link href="/dashboard/users" onClick={() => setOpen(false)} aria-current={isActive('/dashboard/users') ? 'page' : undefined} className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Quản lý người dùng</Link>}
            <Link
              href="/dashboard/recipes/new"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-medium text-accent"
            >
              Viết công thức
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors relative w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm"
            aria-label="Toggle Theme"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all absolute" />
            <Moon className="h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all absolute" />
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}

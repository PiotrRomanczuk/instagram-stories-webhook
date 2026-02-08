"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/app/components/ui/button";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl border-slate-200 bg-white text-slate-800 shadow-sm"
            aria-label="Toggle Theme"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all absolute" />
            <Moon className="h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all absolute" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}

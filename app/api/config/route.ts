import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { AppConfig } from "@/lib/types";
import { defaultConfig } from "@/lib/config";
import { Logger } from "@/lib/utils/logger";

const MODULE = "api:config";
const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "app-config.json");

/**
 * Read the current configuration from file
 */
async function readConfig(): Promise<AppConfig> {
    try {
        const fileContent = await fs.readFile(CONFIG_FILE_PATH, "utf-8");
        return JSON.parse(fileContent) as AppConfig;
    } catch {
        // If file doesn't exist or is invalid, return default config
        return defaultConfig;
    }
}

/**
 * GET: Retrieve current configuration
 * Returns masked secrets for security
 */
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const config = await readConfig();

        // Mask sensitive values for display
        const maskedConfig = {
            ...config,
            google: {
                clientId: config.google.clientId,
                clientSecret: maskSecret(config.google.clientSecret),
            },
            facebook: {
                appId: config.facebook.appId,
                appSecret: maskSecret(config.facebook.appSecret),
            },
            supabase: {
                url: config.supabase.url,
                anonKey: maskSecret(config.supabase.anonKey),
                serviceRoleKey: maskSecret(config.supabase.serviceRoleKey),
                jwtSecret: maskSecret(config.supabase.jwtSecret),
                databasePassword: maskSecret(config.supabase.databasePassword),
            },
            security: {
                webhookSecret: maskSecret(config.security.webhookSecret),
                cronSecret: maskSecret(config.security.cronSecret),
                nextAuthSecret: maskSecret(config.security.nextAuthSecret),
            },
        };

        return NextResponse.json({ config: maskedConfig, hasConfig: isConfigured(config) });
    } catch (error) {
        await Logger.error(MODULE, "Failed to read config", error);
        return NextResponse.json({ error: "Failed to read configuration" }, { status: 500 });
    }
}

/**
 * Mask a secret value for display
 */
function maskSecret(value: string): string {
    if (!value) return "";
    if (value.length <= 8) return "***";
    return value.substring(0, 4) + "***" + value.substring(value.length - 4);
}

/**
 * Check if config has minimum required values
 */
function isConfigured(config: AppConfig): boolean {
    return !!(
        config.adminEmail &&
        config.google.clientId &&
        config.google.clientSecret &&
        config.facebook.appId &&
        config.facebook.appSecret &&
        config.supabase.url &&
        config.supabase.anonKey &&
        config.security.nextAuthSecret
    );
}
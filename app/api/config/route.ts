import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
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
 * Write configuration to file
 */
async function writeConfig(config: AppConfig): Promise<void> {
    // Ensure data directory exists
    const dataDir = path.dirname(CONFIG_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });

    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), "utf-8");
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
 * POST: Update configuration
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(session)) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const newConfig: AppConfig = body.config;

        // Validate required fields
        if (!newConfig) {
            return NextResponse.json({ error: "No configuration provided" }, { status: 400 });
        }

        // Read existing config to preserve unchanged masked values
        const existingConfig = await readConfig();

        // Merge config - if a value is masked (contains ***), keep the existing value
        const mergedConfig: AppConfig = {
            appUrl: newConfig.appUrl || existingConfig.appUrl,
            adminEmail: newConfig.adminEmail || existingConfig.adminEmail,
            google: {
                clientId: newConfig.google.clientId || existingConfig.google.clientId,
                clientSecret: isSecretMasked(newConfig.google.clientSecret)
                    ? existingConfig.google.clientSecret
                    : newConfig.google.clientSecret,
            },
            facebook: {
                appId: newConfig.facebook.appId || existingConfig.facebook.appId,
                appSecret: isSecretMasked(newConfig.facebook.appSecret)
                    ? existingConfig.facebook.appSecret
                    : newConfig.facebook.appSecret,
            },
            supabase: {
                url: newConfig.supabase.url || existingConfig.supabase.url,
                anonKey: isSecretMasked(newConfig.supabase.anonKey)
                    ? existingConfig.supabase.anonKey
                    : newConfig.supabase.anonKey,
                serviceRoleKey: isSecretMasked(newConfig.supabase.serviceRoleKey)
                    ? existingConfig.supabase.serviceRoleKey
                    : newConfig.supabase.serviceRoleKey,
                jwtSecret: isSecretMasked(newConfig.supabase.jwtSecret)
                    ? existingConfig.supabase.jwtSecret
                    : newConfig.supabase.jwtSecret,
                databasePassword: isSecretMasked(newConfig.supabase.databasePassword)
                    ? existingConfig.supabase.databasePassword
                    : newConfig.supabase.databasePassword,
            },
            security: {
                webhookSecret: isSecretMasked(newConfig.security.webhookSecret)
                    ? existingConfig.security.webhookSecret
                    : newConfig.security.webhookSecret,
                cronSecret: isSecretMasked(newConfig.security.cronSecret)
                    ? existingConfig.security.cronSecret
                    : newConfig.security.cronSecret,
                nextAuthSecret: isSecretMasked(newConfig.security.nextAuthSecret)
                    ? existingConfig.security.nextAuthSecret
                    : newConfig.security.nextAuthSecret,
            },
            lastUpdated: new Date().toISOString(),
        };

        await writeConfig(mergedConfig);
        await Logger.info(MODULE, "Configuration updated", { user: session.user.email });

        // Generate .env content for reference
        const envContent = generateEnvContent(mergedConfig);

        return NextResponse.json({
            success: true,
            message: "Configuration saved successfully",
            envContent,
        });
    } catch (error) {
        await Logger.error(MODULE, "Failed to save config", error);
        return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
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
 * Check if a value is masked (contains ***)
 */
function isSecretMasked(value: string): boolean {
    return value?.includes("***") || false;
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

/**
 * Generate .env.local content from config
 */
function generateEnvContent(config: AppConfig): string {
    return `# 🌐 APP CONFIGURATION
# ------------------------------------------------------------------------------
NEXT_PUBLIC_APP_URL=${config.appUrl}
NEXTAUTH_URL=${config.appUrl}

# 🔐 LAYER 1: PRIMARY IDENTITY (NextAuth Google Auth)
# ------------------------------------------------------------------------------
ADMIN_EMAIL=${config.adminEmail}

# Google OAuth Settings
AUTH_GOOGLE_ID=${config.google.clientId}
AUTH_GOOGLE_SECRET=${config.google.clientSecret}

# Used by NextAuth to encrypt cookies
NEXTAUTH_SECRET=${config.security.nextAuthSecret}

# 🎭 LAYER 2: META INTEGRATION (Facebook / Instagram)
# ------------------------------------------------------------------------------
AUTH_FACEBOOK_ID=${config.facebook.appId}
AUTH_FACEBOOK_SECRET=${config.facebook.appSecret}

# Original Meta variables for scripts/direct API calls
NEXT_PUBLIC_FB_APP_ID=${config.facebook.appId}
FB_APP_SECRET=${config.facebook.appSecret}
FB_REDIRECT_URI=${config.appUrl}/api/auth/callback

# 🛡️ EXTERNAL SECURITY (Webhook & Cron)
# ------------------------------------------------------------------------------
WEBHOOK_SECRET=${config.security.webhookSecret}
CRON_SECRET=${config.security.cronSecret}

# ⚡ DATABASE (Supabase)
# ------------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=${config.supabase.url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${config.supabase.anonKey}
SUPABASE_SERVICE_ROLE_KEY=${config.supabase.serviceRoleKey}
SUPABASE_JWT_SECRET=${config.supabase.jwtSecret}
SUPABASE_DATABASE_PASSWORD=${config.supabase.databasePassword}
`;
}

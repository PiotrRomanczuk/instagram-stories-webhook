/**
 * Application Configuration Types
 * Used for local configuration storage via JSON file
 */

export interface AppConfig {
    appUrl: string;
    adminEmail: string;
    google: {
        clientId: string;
        clientSecret: string;
    };
    facebook: {
        appId: string;
        appSecret: string;
    };
    supabase: {
        url: string;
        anonKey: string;
        serviceRoleKey: string;
        jwtSecret: string;
        databasePassword: string;
    };
    security: {
        webhookSecret: string;
        cronSecret: string;
        nextAuthSecret: string;
    };
    lastUpdated: string | null;
}

export const defaultConfig: AppConfig = {
    appUrl: "http://localhost:3000",
    adminEmail: "",
    google: {
        clientId: "",
        clientSecret: "",
    },
    facebook: {
        appId: "",
        appSecret: "",
    },
    supabase: {
        url: "",
        anonKey: "",
        serviceRoleKey: "",
        jwtSecret: "",
        databasePassword: "",
    },
    security: {
        webhookSecret: "",
        cronSecret: "",
        nextAuthSecret: "",
    },
    lastUpdated: null,
};

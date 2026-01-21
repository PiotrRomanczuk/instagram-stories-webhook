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

import { AppConfig } from '../types';

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

import { type DefaultSession } from "next-auth"
import { type UserRole } from "@/lib/types/common"

declare module "next-auth" {
    interface Session {
        supabaseAccessToken?: string
        user: {
            id: string
            role?: UserRole
        } & DefaultSession["user"]
    }
}

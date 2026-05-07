import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { GET } from "@/app/api/health/pipeline/route";
import { getServerSession } from "next-auth";

vi.mock("next-auth");
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

vi.mock("@/lib/storage/local", () => ({
    checkDiskSpace: vi.fn(async () => ({
        freeBytes: 100 * 1024 * 1024 * 1024,
        freePercent: 50,
    })),
}));

vi.mock("@/lib/database/story-archive", () => ({
    countArchivedStories: vi.fn(async () => 42),
}));

vi.mock("@/lib/database/audio-tracks", () => ({
    countActiveAudioTracks: vi.fn(async () => 5),
}));

vi.mock("@/lib/tiktok/auth", () => ({
    getAllTikTokAccounts: vi.fn(async () => [
        { id: "tt-1", expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000 },
    ]),
}));

vi.mock("@/lib/database/linked-accounts", () => ({
    getAllLinkedAccounts: vi.fn(async () => [
        { user_id: "u-1", id: "acct-1" },
    ]),
    isTokenExpired: vi.fn(() => false),
    isTokenExpiringSoon: vi.fn(() => false),
}));

// Stub child_process.spawn so checkFfmpeg resolves without invoking the
// real binary (test environment may not have ffmpeg installed).
import { EventEmitter } from "events";

vi.mock("child_process", () => {
    const spawn = vi.fn(() => {
        const proc = new EventEmitter() as EventEmitter & { stdout: EventEmitter };
        proc.stdout = new EventEmitter();
        setImmediate(() => {
            proc.stdout.emit("data", Buffer.from("ffmpeg version 6.1.1 Copyright"));
            proc.emit("close", 0);
        });
        return proc;
    });
    return {
        default: { spawn },
        spawn,
    };
});

describe("GET /api/health/pipeline", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns only coarse status + timestamp for unauthenticated callers", async () => {
        (getServerSession as unknown as Mock).mockResolvedValue(null);

        const response = await GET();
        const body = await response.json();

        // Coarse shape only
        expect(body.status).toBeDefined();
        expect(["ok", "degraded", "down"]).toContain(body.status);
        expect(body.timestamp).toBeDefined();

        // Must NOT leak any internal infra fingerprinting fields
        expect(body.components).toBeUndefined();
        expect(body.ffmpeg).toBeUndefined();
        expect(body.disk).toBeUndefined();
        expect(body.instagram).toBeUndefined();
        expect(body.audio).toBeUndefined();
        expect(body.tiktok).toBeUndefined();

        const responseText = JSON.stringify(body);
        expect(responseText).not.toContain("6.1.1");        // ffmpeg version
        expect(responseText).not.toContain("freeGb");       // disk number key
        expect(responseText).not.toContain("linkedAccounts"); // account count key
    });

    it("returns full component detail for admin callers", async () => {
        (getServerSession as unknown as Mock).mockResolvedValue({
            user: { id: "admin-1", email: "admin@example.com", role: "admin" },
            expires: "2099-01-01",
        });

        const response = await GET();
        const body = await response.json();

        expect(body.components).toBeDefined();
        expect(body.components.ffmpeg).toBeDefined();
        expect(body.components.disk).toBeDefined();
        expect(body.components.instagram).toBeDefined();
        expect(body.components.audio).toBeDefined();
        expect(body.components.tiktok).toBeDefined();
        expect(body.timestamp).toBeDefined();
    });

    it("does not expose detail to a demo session", async () => {
        (getServerSession as unknown as Mock).mockResolvedValue({
            user: { id: "demo-1", email: "demo@example.com", role: "demo" },
            expires: "2099-01-01",
        });

        const response = await GET();
        const body = await response.json();

        expect(body.components).toBeUndefined();
        expect(["ok", "degraded", "down"]).toContain(body.status);
    });
});

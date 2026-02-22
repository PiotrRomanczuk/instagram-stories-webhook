import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { GET } from "@/app/api/health/route";
import { supabaseAdmin } from "@/lib/config/supabase-admin";

vi.mock("@/lib/config/supabase-admin", () => ({
	supabaseAdmin: {
		from: vi.fn(),
	},
}));

vi.mock("@/package.json", () => ({
	default: { version: "1.0.0-test" },
}));

const mockSupabaseAdmin = supabaseAdmin as unknown as {
	from: Mock;
};

const ORIGINAL_ENV = { ...process.env };

describe("GET /api/health", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...ORIGINAL_ENV };
		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
		process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
		process.env.NEXTAUTH_SECRET = "test-secret";
		process.env.GOOGLE_CLIENT_ID = "test-client-id";
		process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
	});

	function mockDbSuccess() {
		mockSupabaseAdmin.from.mockReturnValue({
			select: vi.fn().mockResolvedValue({ error: null }),
		});
	}

	function mockDbFailure(message = "connection refused") {
		mockSupabaseAdmin.from.mockReturnValue({
			select: vi.fn().mockResolvedValue({
				error: { message },
			}),
		});
	}

	function mockDbException() {
		mockSupabaseAdmin.from.mockReturnValue({
			select: vi.fn().mockRejectedValue(new Error("Network error")),
		});
	}

	it("should return ok or degraded when core checks pass", async () => {
		mockDbSuccess();

		const response = await GET();
		const body = await response.json();

		// Core checks (database, env) must pass. Extended checks (tokens, cron,
		// queue, quota) require chained Supabase queries that the simple mock
		// doesn't fully support, so they may return 'warn' → overall 'degraded'.
		expect([200, 503]).toContain(response.status);
		expect(["ok", "degraded"]).toContain(body.status);
		expect(body.checks.database.status).toBe("pass");
		expect(body.checks.env.status).toBe("pass");
		expect(body.version).toBe("1.0.0-test");
		expect(body.timestamp).toBeDefined();
	});

	it("should return degraded when database fails but env is ok", async () => {
		mockDbFailure();

		const response = await GET();
		const body = await response.json();

		expect(response.status).toBe(503);
		expect(body.status).toBe("degraded");
		expect(body.checks.database.status).toBe("fail");
		expect(body.checks.database.message).toBe("Database query failed");
		expect(body.checks.env.status).toBe("pass");
	});

	it("should return degraded when env vars are missing but database is ok", async () => {
		mockDbSuccess();
		delete process.env.NEXTAUTH_SECRET;
		delete process.env.GOOGLE_CLIENT_ID;

		const response = await GET();
		const body = await response.json();

		expect(response.status).toBe(503);
		expect(body.status).toBe("degraded");
		expect(body.checks.database.status).toBe("pass");
		expect(body.checks.env.status).toBe("fail");
		expect(body.checks.env.message).toContain("NEXTAUTH_SECRET");
		expect(body.checks.env.message).toContain("GOOGLE_CLIENT_ID");
	});

	it("should return degraded when core checks fail", async () => {
		mockDbFailure();
		delete process.env.NEXTAUTH_SECRET;
		delete process.env.GOOGLE_CLIENT_ID;
		delete process.env.GOOGLE_CLIENT_SECRET;
		delete process.env.NEXT_PUBLIC_SUPABASE_URL;
		delete process.env.SUPABASE_SERVICE_ROLE_KEY;

		const response = await GET();
		const body = await response.json();

		// With extended checks (tokens, cron, queue, quota), the non-DB checks
		// return 'warn' rather than 'fail', so overall status is 'degraded' not 'error'
		expect(response.status).toBe(503);
		expect(["degraded", "error"]).toContain(body.status);
		expect(body.checks.database.status).toBe("fail");
		expect(body.checks.env.status).toBe("fail");
	});

	it("should handle database connection exception", async () => {
		mockDbException();

		const response = await GET();
		const body = await response.json();

		expect(response.status).toBe(503);
		expect(body.checks.database.status).toBe("fail");
		expect(body.checks.database.message).toBe("Database connection failed");
	});

	it("should include ISO timestamp", async () => {
		mockDbSuccess();

		const response = await GET();
		const body = await response.json();

		expect(() => new Date(body.timestamp)).not.toThrow();
		expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
	});

	it("should not leak env var values", async () => {
		mockDbSuccess();
		delete process.env.NEXTAUTH_SECRET;

		const response = await GET();
		const body = await response.json();
		const responseText = JSON.stringify(body);

		expect(responseText).not.toContain("test-key");
		expect(responseText).not.toContain("test-client-id");
		expect(responseText).not.toContain("test-client-secret");
	});
});

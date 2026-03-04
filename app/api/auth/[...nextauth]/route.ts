import NextAuth from "next-auth";

async function auth() {
	const { authOptions } = await import("@/lib/auth");
	return NextAuth(authOptions);
}

const handler = async (...args: Parameters<ReturnType<typeof NextAuth>>) => {
	const nextAuth = await auth();
	return nextAuth(...args);
};

export { handler as GET, handler as POST };

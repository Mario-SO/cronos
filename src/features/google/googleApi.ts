import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { URL } from "node:url";
import type { CalendarEvent, GoogleSettings } from "@shared/types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";

const SCOPES = ["https://www.googleapis.com/auth/calendar"].join(" ");

function getClientId(): string {
	const clientId = process.env.CRONOS_GOOGLE_CLIENT_ID;
	if (!clientId) {
		throw new Error("Missing CRONOS_GOOGLE_CLIENT_ID");
	}
	return clientId;
}

function getClientSecret(): string | undefined {
	return process.env.CRONOS_GOOGLE_CLIENT_SECRET;
}

function base64UrlEncode(buffer: Buffer): string {
	return buffer
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function createCodeVerifier(): string {
	return base64UrlEncode(randomBytes(32));
}

function createCodeChallenge(verifier: string): string {
	const digest = createHash("sha256").update(verifier).digest();
	return base64UrlEncode(digest);
}

function openBrowser(url: string): void {
	const platform = process.platform;
	if (platform === "darwin") {
		spawn("open", [url], { stdio: "ignore", detached: true }).unref();
		return;
	}
	if (platform === "win32") {
		spawn("cmd", ["/c", "start", "", url], {
			stdio: "ignore",
			detached: true,
		}).unref();
		return;
	}
	spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
}

export async function startGoogleOAuth(): Promise<{
	accessToken: string;
	refreshToken?: string;
	tokenExpiry: number;
}> {
	const clientId = getClientId();
	const clientSecret = getClientSecret();
	const codeVerifier = createCodeVerifier();
	const codeChallenge = createCodeChallenge(codeVerifier);

	const server = createServer();
	let resolveCode: (code: string) => void;
	let rejectCode: (err: Error) => void;
	const codePromise = new Promise<string>((resolve, reject) => {
		resolveCode = resolve;
		rejectCode = reject;
	});

	server.on("request", (req, res) => {
		if (!req.url) return;
		const reqUrl = new URL(req.url, redirectUri);
		if (reqUrl.pathname !== "/oauth2callback") {
			res.writeHead(404);
			res.end();
			return;
		}
		const code = reqUrl.searchParams.get("code");
		const error = reqUrl.searchParams.get("error");
		if (error) {
			res.writeHead(400);
			res.end("Authorization failed. You can close this window.");
			server.close();
			rejectCode(new Error(error));
			return;
		}
		if (!code) {
			res.writeHead(400);
			res.end("Missing authorization code.");
			return;
		}
		res.writeHead(200, { "Content-Type": "text/plain" });
		res.end("Cronos connected. You can close this window.");
		server.close();
		resolveCode(code);
	});

	let redirectUri = "";
	await new Promise<void>((resolve, reject) => {
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (typeof address === "string" || !address) {
				reject(new Error("Unable to start OAuth server"));
				return;
			}
			redirectUri = `http://127.0.0.1:${address.port}/oauth2callback`;
			resolve();
		});
	});

	const authUrl = new URL(GOOGLE_AUTH_URL);
	authUrl.searchParams.set("client_id", clientId);
	authUrl.searchParams.set("redirect_uri", redirectUri);
	authUrl.searchParams.set("response_type", "code");
	authUrl.searchParams.set("scope", SCOPES);
	authUrl.searchParams.set("access_type", "offline");
	authUrl.searchParams.set("prompt", "consent");
	authUrl.searchParams.set("code_challenge", codeChallenge);
	authUrl.searchParams.set("code_challenge_method", "S256");

	openBrowser(authUrl.toString());

	const code = await codePromise;
	const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: (() => {
			const params = new URLSearchParams({
				code,
				client_id: clientId,
				redirect_uri: redirectUri,
				grant_type: "authorization_code",
				code_verifier: codeVerifier,
			});
			if (clientSecret) {
				params.set("client_secret", clientSecret);
			}
			return params;
		})(),
	});

	if (!tokenResponse.ok) {
		const errorText = await tokenResponse.text();
		throw new Error(`Token exchange failed: ${errorText}`);
	}

	const tokenData = (await tokenResponse.json()) as {
		access_token: string;
		refresh_token?: string;
		expires_in: number;
	};

	return {
		accessToken: tokenData.access_token,
		refreshToken: tokenData.refresh_token,
		tokenExpiry: Date.now() + tokenData.expires_in * 1000,
	};
}

export async function refreshGoogleToken(
	settings: GoogleSettings,
): Promise<
	Pick<GoogleSettings, "accessToken" | "refreshToken" | "tokenExpiry">
> {
	if (!settings.refreshToken) {
		throw new Error("Missing refresh token");
	}
	const clientId = getClientId();
	const clientSecret = getClientSecret();
	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: (() => {
			const params = new URLSearchParams({
				client_id: clientId,
				refresh_token: settings.refreshToken,
				grant_type: "refresh_token",
			});
			if (clientSecret) {
				params.set("client_secret", clientSecret);
			}
			return params;
		})(),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Token refresh failed: ${errorText}`);
	}

	const data = (await response.json()) as {
		access_token: string;
		expires_in: number;
		refresh_token?: string;
	};

	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token ?? settings.refreshToken,
		tokenExpiry: Date.now() + data.expires_in * 1000,
	};
}

export async function googleApiRequest<T>(
	accessToken: string,
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const response = await fetch(`${GOOGLE_API_BASE}${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
			...(options.headers ?? {}),
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Google API error ${response.status}: ${errorText}`);
	}

	return (await response.json()) as T;
}

export function toGoogleAllDayEvent(event: CalendarEvent): {
	summary: string;
	start: { date: string };
	end: { date: string };
} {
	const endDate = addDays(event.date, 1);
	return {
		summary: event.title,
		start: { date: event.date },
		end: { date: endDate },
	};
}

function addDays(dateStr: string, days: number): string {
	const [yearStr, monthStr, dayStr] = dateStr.split("-");
	if (!yearStr || !monthStr || !dayStr) {
		return dateStr;
	}
	const year = Number(yearStr);
	const month = Number(monthStr);
	const day = Number(dayStr);
	const date = new Date(Date.UTC(year, month - 1, day + days));
	return date.toISOString().slice(0, 10);
}

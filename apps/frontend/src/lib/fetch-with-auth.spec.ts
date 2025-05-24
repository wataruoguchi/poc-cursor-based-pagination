import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fetchWithAuth, fetchWithAuthPaginated } from "./fetch-with-auth";

const server = setupServer();

describe("fetchWithAuth", () => {
  const mockGetAccessTokenSilently = vi.fn().mockResolvedValue("test-token");

  beforeEach(() => {
    server.listen();
    mockGetAccessTokenSilently.mockClear();
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
  });

  it("should make a successful request and return parsed data", async () => {
    const testSchema = z.object({
      id: z.number(),
      name: z.string(),
    });
    const mockResponse = {
      id: 1,
      name: "Test",
    };

    server.use(
      http.get("https://api.example.com/test", ({ request }) => {
        expect(request.headers.get("Authorization")).toBe("Bearer test-token");
        expect(request.headers.get("Content-Type")).toBe("application/json");
        return HttpResponse.json(mockResponse);
      }),
    );

    const result = await fetchWithAuth(
      mockGetAccessTokenSilently,
      "https://api.example.com/test",
      testSchema,
    );

    expect(mockGetAccessTokenSilently).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockResponse);
  });

  it("should include custom headers and options", async () => {
    // Setup
    const testSchema = z.object({});
    const mockResponse = {};

    server.use(
      http.post("https://api.example.com/test", async ({ request }) => {
        expect(request.headers.get("Authorization")).toBe("Bearer test-token");
        expect(request.headers.get("Content-Type")).toBe("application/json");
        expect(request.headers.get("Custom-Header")).toBe("value");
        const body = await request.json();
        expect(body).toEqual({ data: "test" });
        return HttpResponse.json(mockResponse);
      }),
    );

    // Execute
    await fetchWithAuth(
      mockGetAccessTokenSilently,
      "https://api.example.com/test",
      testSchema,
      {
        method: "POST",
        headers: {
          "Custom-Header": "value",
        },
        body: JSON.stringify({ data: "test" }),
      },
    );
  });

  it("should throw an error when the response is not ok", async () => {
    // Setup
    const testSchema = z.object({});

    server.use(
      http.get("https://api.example.com/test", () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    // Execute and Verify
    await expect(
      fetchWithAuth(
        mockGetAccessTokenSilently,
        "https://api.example.com/test",
        testSchema,
      ),
    ).rejects.toThrow("HTTP error! status: 404");
  });

  it("should throw an error when the response data does not match the schema", async () => {
    // Setup
    const testSchema = z.object({
      id: z.number(),
      name: z.string(),
    });
    const invalidResponse = {
      id: "not-a-number",
      name: 123,
    };

    server.use(
      http.get("https://api.example.com/test", () => {
        return HttpResponse.json(invalidResponse);
      }),
    );

    // Execute and Verify
    await expect(
      fetchWithAuth(
        mockGetAccessTokenSilently,
        "https://api.example.com/test",
        testSchema,
      ),
    ).rejects.toThrow("Invalid data:");
  });
});

describe("fetchWithAuthPaginated", () => {
  const mockGetAccessTokenSilently = vi.fn().mockResolvedValue("test-token");

  beforeEach(() => {
    server.listen();
    mockGetAccessTokenSilently.mockClear();
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
  });

  it("should make a successful request and return parsed data", async () => {
    const testSchema = z.object({
      id: z.number(),
      name: z.string(),
    });
    const mockResponse = {
      data: [
        { id: 1, name: "Test 1" },
        { id: 2, name: "Test 2" },
      ],
      meta: {
        nextCursor: "next-cursor",
        previousCursor: "previous-cursor",
        totalRowCount: 2,
      },
    };

    server.use(
      http.get("https://api.example.com/test", () => {
        return HttpResponse.json(mockResponse);
      }),
    );

    const result = await fetchWithAuthPaginated(
      mockGetAccessTokenSilently,
      "https://api.example.com/test",
      testSchema,
    );

    expect(mockGetAccessTokenSilently).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockResponse);
  });
});

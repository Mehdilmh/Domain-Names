import { APP_NAME } from "@/config/app";

/** OpenAPI 3.1 spec for the public API. Consumed by /api/openapi and the docs page. */
export function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: `${APP_NAME} API`,
      version: "1.0.0",
      description:
        "Estimate a domain's Buy-It-Now value, confidence, time-to-sell, and comparable sales.",
    },
    servers: [{ url: baseUrl }],
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/v1/appraise": {
        post: {
          summary: "Appraise a domain",
          operationId: "appraise",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["domain"],
                  properties: { domain: { type: "string", example: "cloudmind.io" } },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Appraisal result",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/Appraisal" } },
              },
            },
            "401": { description: "Missing or invalid API key" },
            "402": { description: "Insufficient credits" },
            "422": { description: "Validation error" },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "API key (dp_live_...)" },
      },
      schemas: {
        Appraisal: {
          type: "object",
          properties: {
            domain: { type: "string" },
            valuation: {
              type: "object",
              properties: {
                low: { type: "number" },
                mid: { type: "number" },
                high: { type: "number" },
                currency: { type: "string" },
              },
            },
            confidence: { type: "number", description: "0-100" },
            months_to_sell: { type: "number" },
            liquidity: { type: "number", description: "0-100" },
            category: { type: "string" },
            comparables: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  domain: { type: "string" },
                  price: { type: "number" },
                  soldAt: { type: "string", format: "date-time" },
                  similarity: { type: "number" },
                },
              },
            },
            trademark: {
              type: "object",
              properties: {
                risk: { type: "boolean" },
                level: { type: "string", enum: ["none", "low", "medium", "high"] },
                note: { type: "string" },
              },
            },
            explanation: { type: "string" },
            cached: { type: "boolean" },
            disclaimer: { type: "string" },
            generated_at: { type: "string", format: "date-time" },
          },
        },
      },
    },
  };
}

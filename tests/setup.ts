import { mockDeep, mockReset } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";

export const prismaMock = mockDeep<PrismaClient>();
jest.mock("../src/lib/prisma", () => ({
  prisma: prismaMock,
}));

const redisMock = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  call: jest.fn(),
  on: jest.fn(),
};

jest.mock("../src/lib/redis", () => ({
  redis: redisMock,
  safeGet: jest.fn().mockResolvedValue(null),
  safeSet: jest.fn().mockResolvedValue(undefined),
  safeDel: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  mockReset(prismaMock);
  
  // Reset safe wrappers
  const { safeGet, safeSet, safeDel } = require("../src/lib/redis");
  (safeGet as jest.Mock).mockResolvedValue(null);
  (safeSet as jest.Mock).mockResolvedValue(undefined);
  (safeDel as jest.Mock).mockResolvedValue(undefined);
});

// Keep test CLI clean
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => {
  (console.error as jest.Mock).mockRestore();
  (console.warn as jest.Mock).mockRestore();
});

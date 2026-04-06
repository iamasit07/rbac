import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { prismaMock } from "./setup";
import { env } from "../src/config/env";
import { Role } from "@prisma/client";

// Utility to generate a bulletproof authentication state
const loginAs = (userId: string, role: Role) => {
  const token = jwt.sign({ sub: userId, role }, env.JWT_SECRET);
  
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    email: "test@test.com",
    name: "Tester",
    password: "hash",
    role,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return token;
};

const MOCK_RECORD = {
  id: "rec_123",
  amount: new Object(100.0) as any,
  type: "INCOME" as const,
  category: "SALES",
  date: new Date(),
  notes: "Test",
  userId: "analyst_1",
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe("Role-Based Access Control matrix", () => {
  describe("Authentication Pipeline (401 Unauthorized Rules)", () => {
    it("rejects traffic missing Authorization headers completely", async () => {
      const res = await request(app).get("/api/records");
      expect(res.status).toBe(401);
    });

    it("rejects banned or deactivated users organically via database check", async () => {
      const token = jwt.sign({ sub: "user_1", role: "VIEWER" }, env.JWT_SECRET);
      
      prismaMock.user.findUnique.mockResolvedValue({
         id: "user_1",
         email: "banned@test.com",
         name: "Hacker",
         password: "hash",
         role: "VIEWER",
         isActive: false,
         deletedAt: null,
         createdAt: new Date(),
         updatedAt: new Date()
      });

      const res = await request(app).get("/api/records").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });

  describe("VIEWER Role Enforcements", () => {
    let viewerToken: string;

    beforeEach(() => {
      viewerToken = loginAs("viewer_1", "VIEWER");
    });

    it("allows the VIEWER to view data blocks seamlessly", async () => {
      prismaMock.record.count.mockResolvedValue(1);
      prismaMock.record.findMany.mockResolvedValue([MOCK_RECORD]);
      const res = await request(app).get("/api/records").set("Authorization", `Bearer ${viewerToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("blocks the VIEWER structurally from creating data points (403)", async () => {
      const res = await request(app)
        .post("/api/records")
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ amount: 100, type: "INCOME", category: "SALES", date: "2023-01-01T00:00:00Z" });
      
      expect(res.status).toBe(403);
    });

    it("blocks the VIEWER structurally from deleting data points (403)", async () => {
      const res = await request(app)
        .delete("/api/records/rec_123")
        .set("Authorization", `Bearer ${viewerToken}`);
        
      expect(res.status).toBe(403);
    });
  });

  describe("ANALYST Role Enforcements (Data Ownership)", () => {
    let analystToken: string;

    beforeEach(() => {
      analystToken = loginAs("analyst_1", "ANALYST");
    });

    it("allows ANALYST to successfully create their own records (201)", async () => {
      prismaMock.record.create.mockResolvedValue(MOCK_RECORD);
      
      const res = await request(app)
        .post("/api/records")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ amount: 100, type: "INCOME", category: "SALES", date: "2023-01-01T00:00:00Z" });
      
      expect(res.status).toBe(201);
    });

    it("returns 404 ID-masking when ANALYST attempts updating a record they don't own", async () => {
      prismaMock.record.findUnique.mockResolvedValue({
        ...MOCK_RECORD,
        userId: "some_other_analyst",
      });

      const res = await request(app)
        .patch("/api/records/rec_123")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({ amount: 50 });
        
      expect(res.status).toBe(404);
    });

    it("blocks ANALYST structurally from seeing system admin data points (403)", async () => {
      const res = await request(app).get("/api/users").set("Authorization", `Bearer ${analystToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("ADMIN Role Enforcements (Omnipotence)", () => {
    let adminToken: string;

    beforeEach(() => {
      adminToken = loginAs("admin_1", "ADMIN");
    });

    it("allows ADMIN total deletion authority over ANY record (204)", async () => {
      prismaMock.record.findUnique.mockResolvedValue({
        ...MOCK_RECORD,
        userId: "analyst_unknown_123",
      });
      prismaMock.$transaction.mockResolvedValue([]);

      const res = await request(app)
        .delete("/api/records/rec_123")
        .set("Authorization", `Bearer ${adminToken}`);
        
      expect(res.status).toBe(204);
    });

    it("ADMIN can create records via hierarchical RBAC (201)", async () => {
      prismaMock.record.create.mockResolvedValue(MOCK_RECORD);

      const res = await request(app)
        .post("/api/records")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ amount: 200, type: "EXPENSE", category: "INFRA", date: "2023-06-15T00:00:00Z" });

      expect(res.status).toBe(201);
    });
  });

  describe("Hierarchical RBAC Verification", () => {
    it("ADMIN inherits ANALYST permissions (can update any record)", async () => {
      const adminToken = loginAs("admin_1", "ADMIN");
      prismaMock.record.findUnique.mockResolvedValue({
        ...MOCK_RECORD,
        userId: "analyst_1",
      });
      prismaMock.$transaction.mockResolvedValue([{ ...MOCK_RECORD, amount: 50 }, {}]);

      const res = await request(app)
        .patch("/api/records/rec_123")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ amount: 50 });

      expect(res.status).toBe(200);
    });

    it("VIEWER cannot access ANALYST-level endpoints (403)", async () => {
      const viewerToken = loginAs("viewer_1", "VIEWER");
      const res = await request(app)
        .post("/api/records")
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ amount: 100, type: "INCOME", category: "TEST", date: "2023-01-01T00:00:00Z" });

      expect(res.status).toBe(403);
    });
  });

  describe("Idempotency Key Protection", () => {
    it("returns 201 for idempotent requests with same key", async () => {
      const analystToken = loginAs("analyst_1", "ANALYST");
      prismaMock.record.create.mockResolvedValue(MOCK_RECORD);

      const res = await request(app)
        .post("/api/records")
        .set("Authorization", `Bearer ${analystToken}`)
        .set("Idempotency-Key", "unique-key-123")
        .send({ amount: 100, type: "INCOME", category: "SALES", date: "2023-01-01T00:00:00Z" });
      
      expect(res.status).toBe(201);
      expect(res.body.id).toBe("rec_123");
    });

    it("returns cached response when Idempotency-Key cache hits", async () => {
      const analystToken = loginAs("analyst_1", "ANALYST");

      const { safeGet } = require("../src/lib/redis");
      (safeGet as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify({ status: 201, body: MOCK_RECORD }));

      const res = await request(app)
        .post("/api/records")
        .set("Authorization", `Bearer ${analystToken}`)
        .set("Idempotency-Key", "already-cached-key")
        .send({ amount: 100, type: "INCOME", category: "SALES", date: "2023-01-01T00:00:00Z" });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe("rec_123");
      expect(prismaMock.record.create).not.toHaveBeenCalled();
    });
  });

  describe("AppError isOperational flag", () => {
    it("returns specific error for operational AppErrors", async () => {
      const analystToken = loginAs("analyst_1", "ANALYST");
      prismaMock.record.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/records/nonexistent")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Record not found");
    });
  });
});

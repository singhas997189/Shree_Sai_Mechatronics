import {
  users,
  qrTokens,
  type User,
  type UpsertUser,
  type QRToken,
  type InsertQRToken,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gt } from "drizzle-orm";
import { randomUUID } from "crypto";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByQRToken(token: string): Promise<User | undefined>;
  createQRToken(data: InsertQRToken): Promise<QRToken>;
  validateAndUseQRToken(token: string): Promise<User | undefined>;
  generateQRTokenForUser(userId: string): Promise<string>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByQRToken(token: string): Promise<User | undefined> {
    const [result] = await db
      .select({ user: users })
      .from(qrTokens)
      .innerJoin(users, eq(qrTokens.userId, users.id))
      .where(
        and(
          eq(qrTokens.token, token),
          gt(qrTokens.expiresAt, new Date()),
          eq(qrTokens.used, null)
        )
      );
    
    return result?.user;
  }

  async createQRToken(data: InsertQRToken): Promise<QRToken> {
    const token = randomUUID();
    const [qrToken] = await db
      .insert(qrTokens)
      .values({
        ...data,
        token,
      })
      .returning();
    return qrToken;
  }

  async validateAndUseQRToken(token: string): Promise<User | undefined> {
    const user = await this.getUserByQRToken(token);
    if (user) {
      // Mark token as used
      await db
        .update(qrTokens)
        .set({ used: new Date() })
        .where(eq(qrTokens.token, token));
    }
    return user;
  }

  async generateQRTokenForUser(userId: string): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

    const qrToken = await this.createQRToken({
      userId,
      expiresAt,
    });

    return qrToken.token;
  }
}

export const storage = new DatabaseStorage();

import {
  users,
  qrTokens,
  products,
  shelfLocations,
  components,
  componentRequests,
  fulfillmentLogs,
  type User,
  type UpsertUser,
  type QRToken,
  type InsertQRToken,
  type Product,
  type InsertProduct,
  type ShelfLocation,
  type Component,
  type ComponentRequest,
  type InsertComponentRequest,
  type FulfillmentLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, isNull } from "drizzle-orm";
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
  
  // Inventory operations
  createProduct(product: InsertProduct & { createdBy: string }): Promise<Product>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductByQR(qrCode: string): Promise<Product | undefined>;
  updateProductLocation(productId: string, shelfLocationId: string): Promise<Product>;
  
  // Shelf location operations
  getShelfLocationByQR(qrCode: string): Promise<ShelfLocation | undefined>;
  createShelfLocation(location: { locationName: string; qrCode: string; description?: string }): Promise<ShelfLocation>;
  
  // Component operations
  getComponentByQR(qrCode: string): Promise<Component | undefined>;
  getComponent(id: string): Promise<Component | undefined>;
  
  // Component request operations
  createComponentRequest(request: InsertComponentRequest & { requestedBy: string }): Promise<ComponentRequest>;
  getPendingComponentRequests(): Promise<(ComponentRequest & { product: Product; component: Component })[]>;
  fulfillComponentRequest(requestId: string, fulfilledBy: string): Promise<ComponentRequest>;
  
  // Fulfillment logging
  createFulfillmentLog(log: { productId: string; componentId: string; requestId: string; quantity: number; inventoryPersonId: string }): Promise<FulfillmentLog>;
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
          isNull(qrTokens.used)
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

  // Inventory operations
  async createProduct(productData: InsertProduct & { createdBy: string }): Promise<Product> {
    // Generate unique repair ID
    const uniqueRepairId = `SSM-${String(Date.now()).slice(-5)}`;
    
    const [product] = await db
      .insert(products)
      .values({
        ...productData,
        uniqueRepairId,
        qrCodeData: uniqueRepairId, // Use repair ID as QR data
      })
      .returning();
    return product;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductByQR(qrCode: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.qrCodeData, qrCode));
    return product;
  }

  async updateProductLocation(productId: string, shelfLocationId: string): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ shelfLocationId, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();
    return product;
  }

  // Shelf location operations
  async getShelfLocationByQR(qrCode: string): Promise<ShelfLocation | undefined> {
    const [location] = await db.select().from(shelfLocations).where(eq(shelfLocations.qrCode, qrCode));
    return location;
  }

  async createShelfLocation(locationData: { locationName: string; qrCode: string; description?: string }): Promise<ShelfLocation> {
    const [location] = await db
      .insert(shelfLocations)
      .values(locationData)
      .returning();
    return location;
  }

  // Component operations
  async getComponentByQR(qrCode: string): Promise<Component | undefined> {
    const [component] = await db.select().from(components).where(eq(components.qrCode, qrCode));
    return component;
  }

  async getComponent(id: string): Promise<Component | undefined> {
    const [component] = await db.select().from(components).where(eq(components.id, id));
    return component;
  }

  // Component request operations
  async createComponentRequest(requestData: InsertComponentRequest & { requestedBy: string }): Promise<ComponentRequest> {
    const [request] = await db
      .insert(componentRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getPendingComponentRequests(): Promise<(ComponentRequest & { product: Product; component: Component })[]> {
    const requests = await db
      .select({
        request: componentRequests,
        product: products,
        component: components,
      })
      .from(componentRequests)
      .innerJoin(products, eq(componentRequests.productId, products.id))
      .innerJoin(components, eq(componentRequests.componentId, components.id))
      .where(eq(componentRequests.status, "pending"));
    
    return requests.map(r => ({ ...r.request, product: r.product, component: r.component }));
  }

  async fulfillComponentRequest(requestId: string, fulfilledBy: string): Promise<ComponentRequest> {
    const [request] = await db
      .update(componentRequests)
      .set({ 
        status: "fulfilled", 
        fulfilledBy, 
        fulfilledAt: new Date() 
      })
      .where(eq(componentRequests.id, requestId))
      .returning();
    return request;
  }

  // Fulfillment logging
  async createFulfillmentLog(logData: { productId: string; componentId: string; requestId: string; quantity: number; inventoryPersonId: string }): Promise<FulfillmentLog> {
    const [log] = await db
      .insert(fulfillmentLogs)
      .values(logData)
      .returning();
    return log;
  }
}

export const storage = new DatabaseStorage();

import {
  users,
  qrTokens,
  products,
  shelfLocations,
  components,
  componentRequests,
  fulfillmentLogs,
  productEvents,
  rolePermissions,
  activityLogs,
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
  type ProductEvent,
  type InsertProductEvent,
  type RolePermission,
  type ActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, isNull, like, or, desc, count } from "drizzle-orm";
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
  
  // User management (Admin)
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<User>;
  deactivateUser(userId: string): Promise<boolean>;
  
  // Inventory operations
  createProduct(product: InsertProduct & { createdBy: string }): Promise<Product>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductByQR(qrCode: string): Promise<Product | undefined>;
  updateProductLocation(productId: string, shelfLocationId: string): Promise<Product>;
  assignProductToEngineer(productId: string, engineerId: string): Promise<Product>;
  updateProductStatus(productId: string, status: string): Promise<Product>;
  getProductsForEngineer(engineerId: string): Promise<Product[]>;
  
  // Shelf location operations
  getShelfLocationByQR(qrCode: string): Promise<ShelfLocation | undefined>;
  createShelfLocation(location: { locationName: string; qrCode: string; description?: string }): Promise<ShelfLocation>;
  
  // Component operations
  getComponentByQR(qrCode: string): Promise<Component | undefined>;
  getComponent(id: string): Promise<Component | undefined>;
  searchComponents(query: string): Promise<Component[]>;
  
  // Component request operations
  createComponentRequest(request: InsertComponentRequest & { requestedBy: string }): Promise<ComponentRequest>;
  getPendingComponentRequests(): Promise<(ComponentRequest & { product: Product; component: Component })[]>;
  fulfillComponentRequest(requestId: string, fulfilledBy: string): Promise<ComponentRequest>;
  getComponentRequestsForEngineer(engineerId: string): Promise<(ComponentRequest & { product: Product; component: Component })[]>;
  
  // Fulfillment logging
  createFulfillmentLog(log: { productId: string; componentId: string; requestId: string; quantity: number; inventoryPersonId: string }): Promise<FulfillmentLog>;
  
  // Product events and timeline
  createProductEvent(event: InsertProductEvent): Promise<ProductEvent>;
  getProductTimeline(productId: string): Promise<ProductEvent[]>;
  
  // Role permissions
  getRolePermissions(role: string): Promise<RolePermission[]>;
  updateRolePermission(role: string, permission: string, enabled: boolean): Promise<RolePermission>;
  
  // Activity logs and analytics
  createActivityLog(log: { userId?: string; action: string; entityType?: string; entityId?: string; description?: string; ipAddress?: string; userAgent?: string }): Promise<ActivityLog>;
  getRecentActivity(limit?: number): Promise<ActivityLog[]>;
  getSystemAnalytics(): Promise<{ totalProducts: number; totalUsers: number; completedRepairs: number; pendingRequests: number }>;
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

  // User management (Admin)
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any));
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deactivateUser(userId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  // Extended product operations
  async assignProductToEngineer(productId: string, engineerId: string): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ assignedEngineerId: engineerId, status: "in_progress", updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();
    
    // Create timeline event
    await this.createProductEvent({
      productId,
      eventType: "assigned",
      description: `Product assigned to engineer`,
      userId: engineerId,
    });
    
    return product;
  }

  async updateProductStatus(productId: string, status: string): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();
    
    // Create timeline event
    await this.createProductEvent({
      productId,
      eventType: status as any,
      description: `Product status updated to ${status}`,
    });
    
    return product;
  }

  async getProductsForEngineer(engineerId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.assignedEngineerId, engineerId))
      .orderBy(desc(products.updatedAt));
  }

  // Component search
  async searchComponents(query: string): Promise<Component[]> {
    return await db
      .select()
      .from(components)
      .where(
        or(
          like(components.componentName, `%${query}%`),
          like(components.qrCode, `%${query}%`)
        )
      )
      .orderBy(desc(components.stockQuantity));
  }

  // Extended component request operations
  async getComponentRequestsForEngineer(engineerId: string): Promise<(ComponentRequest & { product: Product; component: Component })[]> {
    const requests = await db
      .select({
        request: componentRequests,
        product: products,
        component: components,
      })
      .from(componentRequests)
      .innerJoin(products, eq(componentRequests.productId, products.id))
      .innerJoin(components, eq(componentRequests.componentId, components.id))
      .where(eq(componentRequests.requestedBy, engineerId))
      .orderBy(desc(componentRequests.createdAt));
    
    return requests.map(r => ({ ...r.request, product: r.product, component: r.component }));
  }

  // Product events and timeline
  async createProductEvent(eventData: InsertProductEvent): Promise<ProductEvent> {
    const [event] = await db
      .insert(productEvents)
      .values(eventData)
      .returning();
    return event;
  }

  async getProductTimeline(productId: string): Promise<ProductEvent[]> {
    return await db
      .select()
      .from(productEvents)
      .where(eq(productEvents.productId, productId))
      .orderBy(desc(productEvents.createdAt));
  }

  // Role permissions
  async getRolePermissions(role: string): Promise<RolePermission[]> {
    return await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.role, role as any));
  }

  async updateRolePermission(role: string, permission: string, enabled: boolean): Promise<RolePermission> {
    const [rolePermission] = await db
      .insert(rolePermissions)
      .values({ role: role as any, permission, enabled })
      .onConflictDoUpdate({
        target: [rolePermissions.role, rolePermissions.permission],
        set: { enabled },
      })
      .returning();
    return rolePermission;
  }

  // Activity logs and analytics
  async createActivityLog(logData: { userId?: string; action: string; entityType?: string; entityId?: string; description?: string; ipAddress?: string; userAgent?: string }): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values(logData)
      .returning();
    return log;
  }

  async getRecentActivity(limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getSystemAnalytics(): Promise<{ totalProducts: number; totalUsers: number; completedRepairs: number; pendingRequests: number }> {
    const [totalProducts] = await db.select({ count: count() }).from(products);
    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [completedRepairs] = await db.select({ count: count() }).from(products).where(eq(products.status, "completed"));
    const [pendingRequests] = await db.select({ count: count() }).from(componentRequests).where(eq(componentRequests.status, "pending"));
    
    return {
      totalProducts: totalProducts.count,
      totalUsers: totalUsers.count,
      completedRepairs: completedRepairs.count,
      pendingRequests: pendingRequests.count,
    };
  }
}

export const storage = new DatabaseStorage();

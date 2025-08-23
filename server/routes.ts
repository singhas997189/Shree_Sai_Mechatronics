import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import QRCode from "qrcode";
import { insertProductSchema, insertComponentRequestSchema, insertProductEventSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // QR Login endpoint
  app.post('/api/auth/qr-login', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "QR token is required" });
      }

      const user = await storage.validateAndUseQRToken(token);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid or expired QR token" });
      }

      // Create a session for the user
      req.login({ claims: { sub: user.id } }, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session" });
        }
        res.json({ user, success: true });
      });
    } catch (error) {
      console.error("QR login error:", error);
      res.status(500).json({ message: "QR login failed" });
    }
  });

  // Generate QR token for user (admin only)
  app.post('/api/auth/generate-qr', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { targetUserId } = req.body;
      
      if (!targetUserId) {
        return res.status(400).json({ message: "Target user ID is required" });
      }

      const token = await storage.generateQRTokenForUser(targetUserId);
      res.json({ token });
    } catch (error) {
      console.error("QR token generation error:", error);
      res.status(500).json({ message: "Failed to generate QR token" });
    }
  });

  // Update user role (admin only)
  app.post('/api/users/update-role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const updateSchema = z.object({
        userId: z.string(),
        role: z.enum(["inventory", "engineer", "admin"]),
      });

      const { userId: targetUserId, role } = updateSchema.parse(req.body);
      
      const updatedUser = await storage.upsertUser({
        id: targetUserId,
        role,
        updatedAt: new Date(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Role update error:", error);
      res.status(400).json({ message: "Failed to update user role" });
    }
  });

  // INVENTORY MANAGEMENT ROUTES
  
  // Create new product entry
  app.post('/api/inventory/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'inventory') {
        return res.status(403).json({ message: "Inventory access required" });
      }

      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct({ ...productData, createdBy: userId });
      
      // Generate QR code for the product
      const qrCodeDataURL = await QRCode.toDataURL(product.uniqueRepairId);
      
      res.json({ product, qrCode: qrCodeDataURL });
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(400).json({ message: "Failed to create product" });
    }
  });

  // Scan QR code to get item info
  app.post('/api/inventory/scan-qr', isAuthenticated, async (req: any, res) => {
    try {
      const { qrCode, type } = req.body;
      
      if (!qrCode) {
        return res.status(400).json({ message: "QR code is required" });
      }

      let result = null;
      
      switch (type) {
        case 'product':
          result = await storage.getProductByQR(qrCode);
          break;
        case 'location':
          result = await storage.getShelfLocationByQR(qrCode);
          break;
        case 'component':
          result = await storage.getComponentByQR(qrCode);
          break;
        default:
          // Try all types
          result = await storage.getProductByQR(qrCode) ||
                  await storage.getShelfLocationByQR(qrCode) ||
                  await storage.getComponentByQR(qrCode);
      }
      
      if (!result) {
        return res.status(404).json({ message: "QR code not found" });
      }
      
      res.json({ result, type: type || 'unknown' });
    } catch (error) {
      console.error("QR scan error:", error);
      res.status(400).json({ message: "Failed to scan QR code" });
    }
  });

  // Assign location to product
  app.post('/api/inventory/assign-location', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'inventory') {
        return res.status(403).json({ message: "Inventory access required" });
      }

      const { productId, locationQR } = req.body;
      
      const location = await storage.getShelfLocationByQR(locationQR);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      const product = await storage.updateProductLocation(productId, location.id);
      res.json({ product, location });
    } catch (error) {
      console.error("Location assignment error:", error);
      res.status(400).json({ message: "Failed to assign location" });
    }
  });

  // Get pending component requests
  app.get('/api/inventory/component-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'inventory') {
        return res.status(403).json({ message: "Inventory access required" });
      }

      const requests = await storage.getPendingComponentRequests();
      res.json(requests);
    } catch (error) {
      console.error("Component requests fetch error:", error);
      res.status(500).json({ message: "Failed to fetch component requests" });
    }
  });

  // Fulfill component request
  app.post('/api/inventory/fulfill-request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'inventory') {
        return res.status(403).json({ message: "Inventory access required" });
      }

      const { requestId, componentQR } = req.body;
      
      // Verify the scanned component matches the request
      const component = await storage.getComponentByQR(componentQR);
      if (!component) {
        return res.status(404).json({ message: "Component not found" });
      }
      
      // Get the request to verify component matches
      const requests = await storage.getPendingComponentRequests();
      const request = requests.find(r => r.id === requestId);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      if (request.componentId !== component.id) {
        return res.status(400).json({ message: "Scanned component does not match request" });
      }
      
      // Fulfill the request
      const fulfilledRequest = await storage.fulfillComponentRequest(requestId, userId);
      
      // Log the fulfillment
      await storage.createFulfillmentLog({
        productId: request.productId,
        componentId: component.id,
        requestId: requestId,
        quantity: request.requestedQuantity,
        inventoryPersonId: userId,
      });
      
      res.json({ request: fulfilledRequest, component });
    } catch (error) {
      console.error("Request fulfillment error:", error);
      res.status(400).json({ message: "Failed to fulfill request" });
    }
  });

  // Create component request (for engineers)
  app.post('/api/inventory/request-component', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'engineer') {
        return res.status(403).json({ message: "Engineer access required" });
      }

      const requestData = insertComponentRequestSchema.parse(req.body);
      const request = await storage.createComponentRequest({ ...requestData, requestedBy: userId });
      
      // Create timeline event
      await storage.createProductEvent({
        productId: requestData.productId,
        eventType: "component_requested",
        description: `Component requested: ${request.id}`,
        userId,
      });
      
      res.json(request);
    } catch (error) {
      console.error("Component request error:", error);
      res.status(400).json({ message: "Failed to create component request" });
    }
  });

  // ENGINEER DASHBOARD ROUTES
  
  // Search components
  app.get('/api/engineer/components/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'engineer') {
        return res.status(403).json({ message: "Engineer access required" });
      }

      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const components = await storage.searchComponents(query as string);
      res.json(components);
    } catch (error) {
      console.error("Component search error:", error);
      res.status(500).json({ message: "Failed to search components" });
    }
  });

  // Get engineer's assigned products
  app.get('/api/engineer/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'engineer') {
        return res.status(403).json({ message: "Engineer access required" });
      }

      const products = await storage.getProductsForEngineer(userId);
      res.json(products);
    } catch (error) {
      console.error("Engineer products fetch error:", error);
      res.status(500).json({ message: "Failed to fetch assigned products" });
    }
  });

  // Get product timeline
  app.get('/api/engineer/products/:productId/timeline', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'engineer') {
        return res.status(403).json({ message: "Engineer access required" });
      }

      const { productId } = req.params;
      const timeline = await storage.getProductTimeline(productId);
      res.json(timeline);
    } catch (error) {
      console.error("Product timeline fetch error:", error);
      res.status(500).json({ message: "Failed to fetch product timeline" });
    }
  });

  // Update product status
  app.patch('/api/engineer/products/:productId/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'engineer') {
        return res.status(403).json({ message: "Engineer access required" });
      }

      const { productId } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const product = await storage.updateProductStatus(productId, status);
      res.json(product);
    } catch (error) {
      console.error("Product status update error:", error);
      res.status(400).json({ message: "Failed to update product status" });
    }
  });

  // Get engineer's component requests
  app.get('/api/engineer/component-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'engineer') {
        return res.status(403).json({ message: "Engineer access required" });
      }

      const requests = await storage.getComponentRequestsForEngineer(userId);
      res.json(requests);
    } catch (error) {
      console.error("Engineer component requests fetch error:", error);
      res.status(500).json({ message: "Failed to fetch component requests" });
    }
  });

  // ADMIN DASHBOARD ROUTES
  
  // Get all users
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create new user
  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userSchema = z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.enum(["inventory", "engineer", "admin"]),
      });

      const userData = userSchema.parse(req.body);
      const newUser = await storage.upsertUser(userData);
      
      await storage.createActivityLog({
        userId,
        action: "create_user",
        entityType: "user",
        entityId: newUser.id,
        description: `Created new user: ${newUser.email}`,
      });
      
      res.json(newUser);
    } catch (error) {
      console.error("User creation error:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  // Deactivate user
  app.delete('/api/admin/users/:targetUserId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { targetUserId } = req.params;
      const success = await storage.deactivateUser(targetUserId);
      
      if (success) {
        await storage.createActivityLog({
          userId,
          action: "deactivate_user",
          entityType: "user",
          entityId: targetUserId,
          description: `Deactivated user: ${targetUserId}`,
        });
      }
      
      res.json({ success });
    } catch (error) {
      console.error("User deactivation error:", error);
      res.status(400).json({ message: "Failed to deactivate user" });
    }
  });

  // Get system analytics
  app.get('/api/admin/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const analytics = await storage.getSystemAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Analytics fetch error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get recent activity logs
  app.get('/api/admin/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { limit } = req.query;
      const activity = await storage.getRecentActivity(limit ? parseInt(limit as string) : 50);
      res.json(activity);
    } catch (error) {
      console.error("Activity logs fetch error:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Get role permissions
  app.get('/api/admin/roles/:role/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.params;
      const permissions = await storage.getRolePermissions(role);
      res.json(permissions);
    } catch (error) {
      console.error("Role permissions fetch error:", error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  // Update role permissions
  app.put('/api/admin/roles/:role/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.params;
      const { permission, enabled } = req.body;
      
      const updatedPermission = await storage.updateRolePermission(role, permission, enabled);
      
      await storage.createActivityLog({
        userId,
        action: "update_permission",
        entityType: "role",
        entityId: role,
        description: `Updated permission ${permission} for ${role} to ${enabled}`,
      });
      
      res.json(updatedPermission);
    } catch (error) {
      console.error("Role permission update error:", error);
      res.status(400).json({ message: "Failed to update role permission" });
    }
  });

  // Assign product to engineer
  app.post('/api/admin/assign-product', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { productId, engineerId, estimatedCompletionTime, reward } = req.body;
      
      const product = await storage.assignProductToEngineer(productId, engineerId);
      
      await storage.createActivityLog({
        userId,
        action: "assign_product",
        entityType: "product",
        entityId: productId,
        description: `Assigned product ${product.uniqueRepairId} to engineer ${engineerId}`,
      });
      
      res.json(product);
    } catch (error) {
      console.error("Product assignment error:", error);
      res.status(400).json({ message: "Failed to assign product" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

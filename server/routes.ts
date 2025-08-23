import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import QRCode from "qrcode";
import { insertProductSchema, insertComponentRequestSchema } from "@shared/schema";

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
      
      res.json(request);
    } catch (error) {
      console.error("Component request error:", error);
      res.status(400).json({ message: "Failed to create component request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

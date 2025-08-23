import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";

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

  const httpServer = createServer(app);
  return httpServer;
}

import fs from "fs";
import path from "path";
import crypto from "crypto";

export class StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), "data", "private_documents");
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, originalName: string, tenantId: string): Promise<string> {
    const tenantDir = path.join(this.baseDir, tenantId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    const ext = path.extname(originalName) || "";
    const randomHex = crypto.randomBytes(16).toString("hex");
    const filename = `${Date.now()}_${randomHex}${ext}`;
    const filePath = path.join(tenantDir, filename);

    await fs.promises.writeFile(filePath, buffer);
    return path.join(tenantId, filename);
  }

  getFilePath(storageKey: string, tenantId: string): string | null {
    // Prevent path traversal
    const safeKey = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, "");
    const fullPath = path.join(this.baseDir, safeKey);
    const tenantDir = path.join(this.baseDir, tenantId);

    if (!fullPath.startsWith(tenantDir)) {
      return null;
    }
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return fullPath;
  }

  async deleteFile(storageKey: string, tenantId: string): Promise<boolean> {
    const filePath = this.getFilePath(storageKey, tenantId);
    if (!filePath) return false;
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();

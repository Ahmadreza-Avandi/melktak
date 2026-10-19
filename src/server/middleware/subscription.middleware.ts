// @ts-nocheck
import { Request, Response, NextFunction } from "express";

export function subscriptionEnforcementMiddleware(req: Request, res: Response, next: NextFunction) {
  // If request is from an authorized support session, bypass subscription block for investigation
  if (req.supportSession) {
    return next();
  }

  const tenant = req.tenant;
  if (!tenant) {
    return next();
  }

  // Check if tenant subscription has expired
  if (tenant.subscription_expires_at) {
    const expiresAt = new Date(tenant.subscription_expires_at);
    const now = new Date();
    if (now > expiresAt || tenant.subscription_status === "EXPIRED") {
      return res.status(403).json({
        success: false,
        error: {
          code: "SUBSCRIPTION_EXPIRED",
          message: "مهلت اشتراک سامانه برای این آژانس به پایان رسیده است. لطفاً جهت تمدید و فعال‌سازی مجدد با مدیریت پلتفرم تماس حاصل فرمایید."
        }
      });
    }
  }

  next();
}

// @ts-nocheck
import { Router } from "express";
import { postgresDb } from "../../db/postgres.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { subscriptionEnforcementMiddleware } from "../../middleware/subscription.middleware.js";

const agentRouter = Router();

agentRouter.use(authMiddleware);
agentRouter.use(subscriptionEnforcementMiddleware);

agentRouter.get("/home", async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    let branchId = (req.query.branch_id as string) || (req.query.branchId as string) || undefined;

    // Enforce branch boundary: non-admins cannot override to another branch
    if (req.user.role_code === "BRANCH_MANAGER" || req.user.role_code === "AGENT") {
      branchId = req.user.branch_id || undefined;
    }

    const branchParam = branchId && branchId !== "ALL" ? { branch_id: branchId } : {};

    const [allTasks, properties, customers, smartMatches, recentActivities] = await Promise.all([
      postgresDb.getTasks(tenantId, { userId, ...branchParam }),
      postgresDb.getProperties(tenantId, { ...branchParam }, req.user),
      postgresDb.getCustomers(tenantId, { ...branchParam }, req.user),
      postgresDb.calculateSmartMatches(tenantId, req.user),
      postgresDb.getRecentActivities(tenantId, 6)
    ]);

    const now = new Date();
    const overdueTasks = allTasks.filter(t => t.status === "OVERDUE" || (t.status === "TODO" && new Date(t.due_at) < now));
    const todayTasks = allTasks.filter(t => {
      if (t.status === "COMPLETED" || t.status === "CANCELLED") return false;
      const dueDate = new Date(t.due_at);
      return dueDate >= now;
    });

    const homeData = {
      agent: {
        id: req.user.id,
        display_name: req.user.display_name,
        agency_name: req.tenant.name,
        agency_code: req.tenant.agency_code,
        branch_name: req.user.branch_name || "شعبه مرکزی"
      },
      metrics: {
        overdue_count: overdueTasks.length,
        today_count: todayTasks.length,
        upcoming_visits_count: 0,
        smart_matches_count: smartMatches.length,
        active_customers_count: customers.length,
        active_properties_count: properties.length
      },
      summary: {
        overdueTasks: overdueTasks.length,
        todayTasks: todayTasks.length,
        upcomingVisits: 0,
        activeCustomers: customers.length,
        activeProperties: properties.length
      },
      overdueTasks,
      todayTasks,
      upcomingVisits: [],
      smartMatches,
      recentActivities
    };

    return res.json({ success: true, data: homeData });
  } catch (error) {
    next(error);
  }
});

export { agentRouter };

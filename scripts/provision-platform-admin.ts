// @ts-nocheck
import { postgresDb } from "../src/server/db/postgres.js";
import bcrypt from "bcryptjs";

async function main() {
  const args = process.argv.slice(2);
  const username = args[0] || process.env.PLATFORM_ADMIN_USERNAME;
  const password = args[1] || process.env.PLATFORM_ADMIN_PASSWORD;
  const displayName = args[2] || process.env.PLATFORM_ADMIN_NAME || "مدیر کل پلتفرم";
  const email = args[3] || process.env.PLATFORM_ADMIN_EMAIL || "superadmin@amlak-os.ir";
  const phone = args[4] || process.env.PLATFORM_ADMIN_PHONE || "09120000000";

  if (!username || !password) {
    console.error("Usage: npx tsx scripts/provision-platform-admin.ts <username> <password> [displayName] [email] [phone]");
    console.error("Or set PLATFORM_ADMIN_USERNAME and PLATFORM_ADMIN_PASSWORD environment variables.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Error: Password must be at least 8 characters.");
    process.exit(1);
  }

  await postgresDb.init();

  const existing = await postgresDb.getPlatformAdminByUsername(username);
  const passwordHash = bcrypt.hashSync(password, 10);

  if (existing) {
    await postgresDb.pg.query(
      `UPDATE platform_admins SET password_hash = $1, display_name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [passwordHash, displayName.trim(), existing.id]
    );
    console.log(`[Platform Admin] Administrator "${username}" updated with new secure credentials.`);
    process.exit(0);
  }

  const admin = await postgresDb.createPlatformAdmin({
    username: username.trim().toLowerCase(),
    password_hash: passwordHash,
    display_name: displayName.trim(),
    email: email.trim(),
    phone: phone.trim()
  });

  console.log(`[Platform Admin] Administrator "${admin.username}" (ID: ${admin.id}) successfully provisioned.`);
  process.exit(0);
}

main().catch(err => {
  console.error("[Platform Admin] Provisioning failed:", err);
  process.exit(1);
});

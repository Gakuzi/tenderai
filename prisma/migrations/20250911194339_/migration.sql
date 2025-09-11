/*
  Warnings:

  - You are about to drop the column `botName` on the `telegram_integrations` table. All the data in the column will be lost.
  - You are about to drop the column `botToken` on the `telegram_integrations` table. All the data in the column will be lost.
  - You are about to drop the column `botUsername` on the `telegram_integrations` table. All the data in the column will be lost.
  - You are about to drop the column `webAppShortName` on the `telegram_integrations` table. All the data in the column will be lost.
  - You are about to drop the column `webAppUrl` on the `telegram_integrations` table. All the data in the column will be lost.
  - You are about to drop the column `webhookSecret` on the `telegram_integrations` table. All the data in the column will be lost.
  - You are about to drop the column `webhookUrl` on the `telegram_integrations` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_telegram_integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "encryptedWebSession" TEXT,
    "sessionUsername" TEXT,
    "displayName" TEXT,
    "qrCodeData" TEXT,
    "qrCodeExpiresAt" DATETIME,
    "connectionStatus" TEXT,
    "webSessionUrl" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "lastError" TEXT,
    "lastCheckedAt" DATETIME,
    "messagesReceived" INTEGER NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "telegram_integrations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_telegram_integrations" ("companyId", "createdAt", "id", "lastCheckedAt", "lastError", "messagesReceived", "messagesSent", "status", "updatedAt") SELECT "companyId", "createdAt", "id", "lastCheckedAt", "lastError", "messagesReceived", "messagesSent", "status", "updatedAt" FROM "telegram_integrations";
DROP TABLE "telegram_integrations";
ALTER TABLE "new_telegram_integrations" RENAME TO "telegram_integrations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

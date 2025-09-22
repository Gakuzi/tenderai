import express from 'express';
import { integrationManager } from '../services/integrations/integration-manager.ts';
import { IntegrationType } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';

const router = express.Router();

// Middleware для обработки ошибок
const asyncHandler = (fn: (arg0: any, arg1: any, arg2: any) => any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// POST /api/whatsapp/connect - Инициализация и подключение
router.post('/connect', asyncHandler(async (req, res) => {
  const { companyId } = req.body;
  if (!companyId) {
    return res.status(400).json({ success: false, message: 'companyId is required' });
  }

  const manager = integrationManager.getInstance(companyId);
  const response = await manager.initializeQRAuth({
    companyId,
    integrationType: IntegrationType.WHATSAPP,
  });

  res.json(response);
}));

// GET /api/whatsapp/status - Проверка статуса
router.get('/status', asyncHandler(async (req, res) => {
  const { companyId, integrationId } = req.query;
  if (!companyId && !integrationId) {
    return res.status(400).json({ success: false, message: 'companyId or integrationId is required' });
  }

  // Находим интеграцию
  const whereClause = integrationId ? { id: integrationId as string } : { companyId: companyId as string };
  const integration = await prisma.whatsAppIntegration.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  if (!integration) {
    return res.status(404).json({ success: false, message: 'Integration not found' });
  }

  res.json({
    success: true,
    integration: {
      id: integration.id,
      companyId: integration.companyId,
      status: integration.status,
      connectionStatus: integration.connectionStatus,
      displayName: integration.displayName,
      phoneNumber: integration.phoneNumber,
      qrCodeData: integration.qrCodeData,
      qrCodeExpiresAt: integration.qrCodeExpiresAt,
      lastError: integration.lastError,
      lastCheckedAt: integration.lastCheckedAt,
    },
  });
}));

// POST /api/whatsapp/disconnect - Отключение
router.post('/disconnect', asyncHandler(async (req, res) => {
  const { companyId, integrationId } = req.body;
  if (!companyId && !integrationId) {
    return res.status(400).json({ success: false, message: 'companyId or integrationId is required' });
  }

  const manager = integrationManager.getInstance(companyId);

  // Находим ID интеграции, если он не передан
  let finalIntegrationId = integrationId;
  if (!finalIntegrationId) {
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (integration) {
      finalIntegrationId = integration.id;
    }
  }

  if (!finalIntegrationId) {
    return res.status(404).json({ success: false, message: 'Active integration not found to disconnect' });
  }

  await manager.disconnectIntegration(finalIntegrationId, IntegrationType.WHATSAPP);

  res.json({ success: true, message: 'WhatsApp integration disconnected' });
}));

export default router;

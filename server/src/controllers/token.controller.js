import {
  createToken,
  getPublicTokenStatus,
  cancelTokenByPatient,
  getPublicDisplayData
} from '../services/queue.service.js';
import { queueEvents } from '../services/eventBus.js';
import { generateQRCodeDataURL } from '../services/qr.service.js';
import { env } from '../config/env.js';

export const bookToken = async (req, res, next) => {
  try {
    const { doctorId, department, clinicId, patientName, patientPhone, priority, notes } = req.body;

    const token = await createToken({
      doctorId,
      department,
      clinicId,
      patientName,
      patientPhone,
      priority,
      source: 'ONLINE',
      notes
    });

    const trackingUrl = `${env.CLIENT_URL}/track/${token.trackingUuid}`;
    const qrDataUrl = await generateQRCodeDataURL(trackingUrl);

    res.status(201).json({
      success: true,
      data: {
        tokenNumber: token.tokenNumber,
        displayCode: token.displayCode,
        trackingUuid: token.trackingUuid,
        priority: token.priority,
        estimatedWaitMinutes: token.estimatedWaitMinutes,
        estimatedWaitDisplay: token.estimatedWaitDisplay,
        assignmentRationale: token.assignmentRationale,
        trackingUrl,
        qrCode: qrDataUrl,
        bookedAt: token.bookedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const trackToken = async (req, res, next) => {
  try {
    const { trackingUuid } = req.params;

    // Strict no-store headers for real-time queue data and privacy
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const statusData = await getPublicTokenStatus(trackingUuid);
    if (!statusData) {
      return res.status(404).json({
        success: false,
        error: 'Token not found. Please check your tracking link.'
      });
    }

    res.status(200).json({
      success: true,
      data: statusData
    });
  } catch (error) {
    next(error);
  }
};

export const getQRCode = async (req, res, next) => {
  try {
    const { trackingUuid } = req.params;
    const trackingUrl = `${env.CLIENT_URL}/track/${trackingUuid}`;
    const qrCode = await generateQRCodeDataURL(trackingUrl);

    res.status(200).json({
      success: true,
      data: {
        trackingUuid,
        trackingUrl,
        qrCode
      }
    });
  } catch (error) {
    next(error);
  }
};

export const requestStatusNotification = async (req, res, next) => {
  try {
    const { trackingUuid } = req.params;
    const { requestStatusHelpSMS } = await import('../services/queue.service.js');
    const notification = await requestStatusHelpSMS(trackingUuid);

    res.status(200).json({
      success: true,
      data: {
        message: 'Status notification successfully requested',
        notificationStatus: notification?.status || 'SENT'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Patient voluntarily cancels their appointment via trackingUuid.
 */
export const cancelPatientToken = async (req, res, next) => {
  try {
    const { trackingUuid } = req.params;
    const { reason } = req.body || {};
    const cancelled = await cancelTokenByPatient(
      trackingUuid,
      reason || 'Patient voluntarily cancelled appointment'
    );

    res.status(200).json({
      success: true,
      message: 'Your appointment has been successfully cancelled. Thank you for freeing the slot.',
      data: {
        trackingUuid: cancelled.trackingUuid,
        tokenNumber: cancelled.tokenNumber,
        displayCode: cancelled.displayCode,
        status: cancelled.status,
        cancelledAt: cancelled.cancelledAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Server-Sent Events (SSE) stream for instantaneous token status updates (<100ms).
 */
export const streamTokenStatus = async (req, res, next) => {
  try {
    const { trackingUuid } = req.params;
    const initialData = await getPublicTokenStatus(trackingUuid);
    if (!initialData) {
      return res.status(404).json({
        success: false,
        error: 'Token not found.'
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.flushHeaders?.();

    // Push initial authoritative state
    res.write(`event: initial\ndata: ${JSON.stringify(initialData)}\n\n`);

    // Listeners for token updates and queue depth updates
    const onTokenUpdated = async (eventData) => {
      if (eventData.trackingUuid === trackingUuid) {
        const fresh = await getPublicTokenStatus(trackingUuid);
        if (fresh && !res.writableEnded) {
          res.write(`event: token_update\ndata: ${JSON.stringify(fresh)}\n\n`);
        }
      }
    };

    const onQueueChanged = async (eventData) => {
      const fresh = await getPublicTokenStatus(trackingUuid);
      if (fresh && !res.writableEnded) {
        res.write(`event: queue_update\ndata: ${JSON.stringify(fresh)}\n\n`);
      }
    };

    queueEvents.on('token:updated', onTokenUpdated);
    queueEvents.on('queue:changed', onQueueChanged);

    // Keep-alive heartbeat every 15s to keep connections alive through proxies
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': heartbeat\n\n');
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      queueEvents.off('token:updated', onTokenUpdated);
      queueEvents.off('queue:changed', onQueueChanged);
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns public waiting room display data across all active clinic rooms.
 */
export const getPublicDisplay = async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const displayData = await getPublicDisplayData();
    res.status(200).json({
      success: true,
      data: displayData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Server-Sent Events (SSE) stream for public waiting room TV displays.
 */
export const streamPublicDisplay = async (req, res, next) => {
  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.flushHeaders?.();

    const initialData = await getPublicDisplayData();
    res.write(`event: initial\ndata: ${JSON.stringify(initialData)}\n\n`);

    const onDisplayChange = async () => {
      const fresh = await getPublicDisplayData();
      if (fresh && !res.writableEnded) {
        res.write(`event: display_update\ndata: ${JSON.stringify(fresh)}\n\n`);
      }
    };

    queueEvents.on('token:updated', onDisplayChange);
    queueEvents.on('token:created', onDisplayChange);
    queueEvents.on('queue:changed', onDisplayChange);

    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': heartbeat\n\n');
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      queueEvents.off('token:updated', onDisplayChange);
      queueEvents.off('token:created', onDisplayChange);
      queueEvents.off('queue:changed', onDisplayChange);
    });
  } catch (error) {
    next(error);
  }
};


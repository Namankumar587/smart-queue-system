import { createToken } from '../services/queue.service.js';
import { getReceptionOverviewData } from '../services/clinic.service.js';
import { Token } from '../models/Token.js';
import { AuditLog } from '../models/AuditLog.js';
import { TOKEN_STATUS } from '../config/constants.js';

export const registerWalkin = async (req, res, next) => {
  try {
    const { doctorId, patientName, patientPhone, priority = 'STANDARD', notes } = req.body;

    const token = await createToken({
      doctorId,
      patientName,
      patientPhone,
      priority,
      source: 'WALKIN',
      notes
    });

    res.status(201).json({
      success: true,
      data: {
        tokenNumber: token.tokenNumber,
        trackingUuid: token.trackingUuid,
        priority: token.priority,
        estimatedWaitMinutes: token.estimatedWaitMinutes,
        source: token.source,
        bookedAt: token.bookedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getReceptionOverview = async (req, res, next) => {
  try {
    const data = await getReceptionOverviewData();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const checkInToken = async (req, res, next) => {
  try {
    const { trackingUuid, tokenNumber, doctorId } = req.body;
    let token = null;

    if (trackingUuid) {
      token = await Token.findOne({ trackingUuid }).populate('doctorId');
    } else if (tokenNumber && doctorId) {
      const todayStr = new Date().toISOString().split('T')[0];
      token = await Token.findOne({ tokenNumber, doctorId, date: todayStr }).populate('doctorId');
    }

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found for check-in'
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (token.date !== todayStr) {
      return res.status(400).json({
        success: false,
        error: 'Token date does not match today. Check-in is only allowed on the scheduled appointment date.'
      });
    }

    if (token.status !== TOKEN_STATUS.WAITING) {
      return res.status(400).json({
        success: false,
        error: `Cannot check in token with status '${token.status}'. Token must be in WAITING state.`
      });
    }

    // Idempotency: repeated scans prevent duplicate transitions
    if (token.isCheckedIn) {
      return res.status(200).json({
        success: true,
        alreadyCheckedIn: true,
        message: 'Patient is already checked in',
        data: {
          tokenNumber: token.tokenNumber,
          displayCode: token.displayCode,
          isCheckedIn: true,
          checkedInAt: token.checkedInAt
        }
      });
    }

    token.isCheckedIn = true;
    token.checkedInAt = new Date();
    await token.save();

    // Audit check-in event
    AuditLog.create({
      action: 'TOKEN_CHECKED_IN',
      performedBy: req.user?._id || null,
      performedByRole: req.user?.role || 'RECEPTIONIST',
      targetType: 'TOKEN',
      targetId: token._id,
      details: {
        tokenNumber: token.tokenNumber,
        displayCode: token.displayCode,
        doctorId: token.doctorId?._id
      }
    }).catch((e) => console.error('[AuditLog] Error:', e.message));

    res.status(200).json({
      success: true,
      alreadyCheckedIn: false,
      message: 'Check-in successful',
      data: {
        tokenNumber: token.tokenNumber,
        displayCode: token.displayCode,
        isCheckedIn: true,
        checkedInAt: token.checkedInAt,
        patientName: token.patientName
      }
    });
  } catch (error) {
    next(error);
  }
};


import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ROLES } from '../config/constants.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required. Format: Bearer <token>',
        requestId: req.id || null,
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Session token has expired. Please log in again.',
          requestId: req.id || null,
          timestamp: new Date().toISOString()
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid or malformed session token',
        requestId: req.id || null,
        timestamp: new Date().toISOString()
      });
    }

    const userId = decoded.sub || decoded.id;
    const user = await User.findById(userId).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authenticated user no longer exists',
        requestId: req.id || null,
        timestamp: new Date().toISOString()
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Please contact clinic administrator.',
        requestId: req.id || null,
        timestamp: new Date().toISOString()
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal authorization error',
      requestId: req.id || null,
      timestamp: new Date().toISOString()
    });
  }
};

// Alias for backwards compatibility
export const authenticate = requireAuth;

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        requestId: req.id || null,
        timestamp: new Date().toISOString()
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: ${roles.join(', ')}`,
        requestId: req.id || null,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

export const verifyDoctorOwnership = (req, res, next) => {
  if (req.user.role === ROLES.ADMIN) {
    return next(); // Admins bypass doctor-level restrictions
  }

  if (req.user.role === ROLES.DOCTOR) {
    const targetDoctorId = req.params.doctorId || req.body.doctorId || req.query.doctorId;
    const userDoctorId = req.user.doctorProfileId?._id?.toString() || req.user.doctorProfileId?.toString();

    if (!userDoctorId) {
      return res.status(403).json({
        success: false,
        error: 'Doctor profile unlinked or not configured',
        requestId: req.id || null,
        timestamp: new Date().toISOString()
      });
    }

    if (targetDoctorId && userDoctorId !== targetDoctorId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Doctors can only access their own designated queue',
        requestId: req.id || null,
        timestamp: new Date().toISOString()
      });
    }
  }

  next();
};

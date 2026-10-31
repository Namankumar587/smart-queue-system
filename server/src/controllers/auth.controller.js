import { loginStaff, createStaffAccount } from '../services/auth.service.js';

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required',
        requestId: req.id || null,
        timestamp: new Date().toISOString()
      });
    }

    const assignedRole = role && ['RECEPTIONIST', 'DOCTOR', 'ADMIN'].includes(role.toUpperCase())
      ? role.toUpperCase()
      : 'RECEPTIONIST';

    await createStaffAccount({
      name: name.trim(),
      email: email.trim(),
      password,
      role: assignedRole
    });

    const result = await loginStaff(email, password);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      requestId: req.id || null,
      timestamp: new Date().toISOString()
    });
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await loginStaff(email, password);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 401;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      requestId: req.id || null,
      timestamp: new Date().toISOString()
    });
  }
};

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
};

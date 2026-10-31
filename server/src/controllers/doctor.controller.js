import { getDoctorQueueData, processDoctorAction } from '../services/doctor.service.js';

export const getMyQueue = async (req, res, next) => {
  try {
    const targetDoctorId =
      req.query.doctorId || req.params.doctorId || req.user.doctorProfileId?._id || req.user.doctorProfileId;

    if (!targetDoctorId) {
      return res.status(400).json({
        success: false,
        error: 'No target doctor profile specified or linked to this account'
      });
    }

    const data = await getDoctorQueueData(targetDoctorId, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const handleDoctorAction = async (req, res, next) => {
  try {
    const { tokenId } = req.params;
    const { action } = req.body;

    const updatedToken = await processDoctorAction(tokenId, action, req.user);
    res.status(200).json({ success: true, data: updatedToken });
  } catch (error) {
    next(error);
  }
};

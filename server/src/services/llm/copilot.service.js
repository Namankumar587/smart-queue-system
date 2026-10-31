import mongoose from 'mongoose';
import { Token } from '../../models/Token.js';
import { Doctor } from '../../models/Doctor.js';

/**
 * Staff Copilot Service (Optional / Future Phase)
 *
 * CRITICAL SAFETY & PRIVACY INVARIANTS:
 * 1. Strictly allow-listed read-only aggregate functions ONLY:
 *    - getSummary(clinicId, date)
 *    - getNoShowCounts(clinicId, date)
 *    - getAverageServiceTime(clinicId, date)
 * 2. Scoped strictly to the authenticated staff member's clinic.
 * 3. Never queries, projects, or exposes raw patient rows (zero names, phones, IDs).
 * 4. Returns verifiable source numbers side-by-side with generated narrative.
 */

export const COPILOT_FEATURE_STAGE = 'OPTIONAL_FUTURE_PHASE';

/**
 * 1. Allow-listed Aggregate: getSummary
 * Counts tokens grouped by status for the clinic today.
 */
export const getSummary = async (clinicId, dateStr) => {
  const cId = new mongoose.Types.ObjectId(clinicId);
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  const results = await Token.aggregate([
    {
      $match: {
        clinicId: cId,
        date: targetDate
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const summary = {
    total: 0,
    waiting: 0,
    called: 0,
    completed: 0,
    cancelled: 0,
    skipped: 0
  };

  for (const row of results) {
    const statusKey = (row._id || '').toLowerCase();
    if (summary[statusKey] !== undefined) {
      summary[statusKey] = row.count;
    }
    summary.total += row.count;
  }

  return summary;
};

/**
 * 2. Allow-listed Aggregate: getNoShowCounts
 * Aggregates cancelled and skipped tokens for the clinic today.
 */
export const getNoShowCounts = async (clinicId, dateStr) => {
  const cId = new mongoose.Types.ObjectId(clinicId);
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  const results = await Token.aggregate([
    {
      $match: {
        clinicId: cId,
        date: targetDate,
        status: { $in: ['CANCELLED', 'SKIPPED'] }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const noShows = {
    cancelledCount: 0,
    skippedCount: 0,
    totalNoShows: 0
  };

  for (const row of results) {
    if (row._id === 'CANCELLED') noShows.cancelledCount = row.count;
    if (row._id === 'SKIPPED') noShows.skippedCount = row.count;
  }

  noShows.totalNoShows = noShows.cancelledCount + noShows.skippedCount;
  return noShows;
};

/**
 * 3. Allow-listed Aggregate: getAverageServiceTime
 * Computes average consultation duration in minutes across completed tokens today.
 */
export const getAverageServiceTime = async (clinicId, dateStr) => {
  const cId = new mongoose.Types.ObjectId(clinicId);
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  const results = await Token.aggregate([
    {
      $match: {
        clinicId: cId,
        date: targetDate,
        status: 'COMPLETED',
        consultationDurationMinutes: { $ne: null, $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$consultationDurationMinutes' },
        sampleSize: { $sum: 1 }
      }
    }
  ]);

  if (results.length > 0) {
    return {
      avgServiceTimeMinutes: Math.round(results[0].avgDuration * 10) / 10,
      sampleSize: results[0].sampleSize
    };
  }

  // Fallback: estimate from clinic doctors' default consultation pacing
  const doctors = await Doctor.find({ clinicId: cId, isAvailable: true }).select('avgConsultMinutes');
  const fallbackAvg = doctors.length > 0
    ? Math.round((doctors.reduce((sum, d) => sum + (d.avgConsultMinutes || 10), 0) / doctors.length) * 10) / 10
    : 10.0;

  return {
    avgServiceTimeMinutes: fallbackAvg,
    sampleSize: 0,
    note: 'Baseline estimation from doctor schedules (no completed consultations with duration recorded yet today)'
  };
};

/**
 * Generates grounded staff copilot response with verifiable source numbers side-by-side.
 */
export const getStaffCopilotBriefing = async (clinicId, dateStr) => {
  const [summary, noShows, serviceTime] = await Promise.all([
    getSummary(clinicId, dateStr),
    getNoShowCounts(clinicId, dateStr),
    getAverageServiceTime(clinicId, dateStr)
  ]);

  const sourceMetrics = {
    totalTokens: summary.total,
    waiting: summary.waiting,
    inConsultation: summary.called,
    completed: summary.completed,
    cancelled: summary.cancelled,
    skipped: summary.skipped,
    totalNoShows: noShows.totalNoShows,
    avgServiceTimeMinutes: serviceTime.avgServiceTimeMinutes,
    completedSamples: serviceTime.sampleSize
  };

  // Generate grounded narrative derived directly from the exact source numbers
  const narrative =
    `Today the clinic has handled ${sourceMetrics.totalTokens} total tokens. ` +
    `Currently, ${sourceMetrics.waiting} patient(s) are waiting in queue, ${sourceMetrics.inConsultation} are in consultation, ` +
    `and ${sourceMetrics.completed} have completed their visits. ` +
    `A total of ${sourceMetrics.totalNoShows} no-shows/cancellations were recorded (${sourceMetrics.cancelled} cancelled, ${sourceMetrics.skipped} skipped). ` +
    `Average service time is ${sourceMetrics.avgServiceTimeMinutes} minutes per consultation.`;

  return {
    featureStage: COPILOT_FEATURE_STAGE,
    dataScope: 'READ_ONLY_AGGREGATES_NO_PII',
    sourceMetrics,
    narrative
  };
};

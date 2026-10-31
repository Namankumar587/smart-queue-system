import { handleInboundSms } from '../services/llm/smsIntentParser.js';
import { defaultLlmGateway } from '../services/llm/smsIntentParser.js';
import { getActiveDoctorList, getClinicRulesContext } from '../services/llm/tools.js';
import { answerPatientFaq } from '../services/llm/patientFaq.service.js';
import { getStaffCopilotBriefing } from '../services/llm/copilot.service.js';
import { Doctor } from '../models/Doctor.js';
import { Clinic } from '../models/Clinic.js';

export const handleSmsInboundController = async (req, res, next) => {
  try {
    const { Body, From, message, phone } = req.body;
    const incomingText = Body || message || '';
    const incomingPhone = From || phone || '+91-9999900000';

    const result = await handleInboundSms(incomingText, incomingPhone);

    res.status(200).json({
      success: true,
      data: {
        reply: result.replyText,
        intent: result.intent,
        actionExecuted: result.actionExecuted,
        metadata: result.metadata
      }
    });
  } catch (err) {
    next(err);
  }
};

export const handleAssistantChatController = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Field 'message' is required and must be a string"
      });
    }

    const [activeDoctors, clinicRules] = await Promise.all([
      getActiveDoctorList(),
      getClinicRulesContext()
    ]);

    const pipelineResult = await defaultLlmGateway.executePipeline({
      rawMessage: message,
      promptBuilder: (sanitized) => `You are a helpful assistant for GL Bajaj Clinic.
Answer questions about clinic hours, doctors, and wait times.
Never give medical advice.
Always include the disclaimer: "This assistant provides queue navigation only and cannot give medical advice."

Clinic context:
Hours: ${clinicRules.openTime} to ${clinicRules.closeTime}
Doctors available: ${activeDoctors.map((d) => `${d.name} (${d.department})`).join(', ')}

Patient message:
${sanitized}
`,
      useCase: 'CHAT_ASSISTANT',
      sessionId: req.ip || 'anon'
    });

    if (pipelineResult.isDirectFaq) {
      return res.status(200).json({
        success: true,
        data: {
          reply: pipelineResult.faqResponse,
          source: 'DETERMINISTIC_FAQ'
        }
      });
    }

    if (!pipelineResult.success) {
      return res.status(200).json({
        success: true,
        data: {
          reply:
            '[GL Bajaj Clinic] Operating hours: Monday-Friday 08:30 to 17:30. For appointments, please visit our online booking portal.',
          source: 'FALLBACK'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        reply: pipelineResult.rawOutput,
        source: 'LLM_ASSISTANT'
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PROMPT 27: Patient FAQ Controller (Optional / Future Phase)
 * Grounded ONLY in approved clinic knowledge base and caller's own read-only token status.
 */
export const handlePatientFaqController = async (req, res, next) => {
  try {
    const { query, tokenTrackingUuid } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Field 'query' is required and must be a string"
      });
    }

    const result = await answerPatientFaq({ query, tokenTrackingUuid });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PROMPT 27: Staff Copilot Controller (Optional / Future Phase)
 * Calls ONLY allow-listed read-only aggregate functions scoped to staff member's clinic.
 * Displays verifiable source numbers alongside narrative. Zero raw patient rows.
 */
export const handleStaffCopilotController = async (req, res, next) => {
  try {
    let clinicId = req.user?.clinicId;

    if (!clinicId && req.user?.doctorProfileId) {
      const doc = await Doctor.findById(req.user.doctorProfileId).select('clinicId');
      if (doc?.clinicId) {
        clinicId = doc.clinicId;
      }
    }

    if (!clinicId) {
      const activeDoctor = await Doctor.findOne({ isAvailable: true }).select('clinicId');
      if (activeDoctor?.clinicId) {
        clinicId = activeDoctor.clinicId;
      }
    }

    if (!clinicId) {
      const primaryClinic = (await Clinic.findOne({ isActive: true })) || (await Clinic.findOne());
      if (primaryClinic) {
        clinicId = primaryClinic._id;
      }
    }

    if (!clinicId) {
      return res.status(403).json({
        success: false,
        error: 'Authenticated user is not assigned to a valid clinic'
      });
    }

    const dateStr = req.query.date;
    const briefing = await getStaffCopilotBriefing(clinicId, dateStr);

    res.status(200).json({
      success: true,
      data: briefing
    });
  } catch (err) {
    next(err);
  }
};

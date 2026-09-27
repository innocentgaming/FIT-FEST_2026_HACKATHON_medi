/**
 * Critical Safety & Administrative Guard Middleware
 *
 * MediLink CARE is strictly an administrative and logistical coordination engine.
 * It is NOT a medical diagnosis, disease prediction, treatment recommendation,
 * or prescription generation tool.
 */

const MEDICAL_PROHIBITED_TERMS = [
  'prescribe',
  'prescription',
  'diagnose',
  'diagnosis',
  'prognosis',
  'cure',
  'clinical decision',
  'dosage recommendation'
];

const administrativeSafetyGuard = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body).toLowerCase();

    for (const term of MEDICAL_PROHIBITED_TERMS) {
      if (bodyString.includes(term.toLowerCase())) {
        return res.status(400).json({
          error: `[SAFETY WARNING] Scope Violation: MediLink CARE coordinates healthcare logistics, beds, blood bank stock, ambulances, and appointments only. Clinical/Diagnostic terms ('${term}') are strictly prohibited.`,
          disclaimer: 'MediLink is NOT a medical diagnostic or treatment platform.'
        });
      }
    }
  }

  // Attach safety header
  res.setHeader('X-MediLink-Scope', 'Administrative-Coordination-Only');
  next();
};

module.exports = { administrativeSafetyGuard };

import mongoose from 'mongoose';

const { Schema } = mongoose;

const StatusEntrySchema = new Schema({
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed', 'pending'],
    required: true,
  },
  at:  { type: Date, default: Date.now },
  raw: { type: Schema.Types.Mixed },   // raw provider webhook payload for this transition
}, { _id: false });

const WabaMessageLogSchema = new Schema({
  // Provider-assigned message id (null until first webhook or dry-run)
  providerMessageId: { type: String, index: true, sparse: true },

  recipientPhone: { type: String, required: true, index: true },

  // Optional link to a patient document for audit trail (no PHI stored here)
  patientRef: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },

  templateName: { type: String, required: true },

  // Ordered variable values that were substituted into the template
  variables: [{ type: String }],

  // Current delivery state
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
    index: true,
  },

  // Full state timeline — webhook updates append here
  statusHistory: [StatusEntrySchema],

  // Who/what triggered the send: a user _id stringified, or a system label like 'System:ReportFinalized'
  triggeredBy: { type: String },

  // Error message when status = 'failed'
  error: { type: String },

}, {
  timestamps: true,
  collection:  'waba_message_logs',
  minimize:    false,
});

// Compound index for status dashboard queries
WabaMessageLogSchema.index({ status: 1, createdAt: -1 }, { background: true });
WabaMessageLogSchema.index({ templateName: 1, createdAt: -1 }, { background: true });

const WabaMessageLog = mongoose.model('WabaMessageLog', WabaMessageLogSchema);

export default WabaMessageLog;

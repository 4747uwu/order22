import mongoose from 'mongoose';

const studyViewLogSchema = new mongoose.Schema({
  study: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DicomStudy',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    default: ''
  },
  userRole: {
    type: String,
    default: ''
  },
  mode: {
    type: String,
    enum: ['viewing', 'reporting'],
    default: 'viewing'
  },
  openedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  closedAt: {
    type: Date,
    default: null
  },
  durationSeconds: {
    type: Number,
    default: null
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  }
}, {
  timestamps: true
});

// Index for efficient queries
studyViewLogSchema.index({ study: 1, openedAt: -1 });

const StudyViewLog = mongoose.model('StudyViewLog', studyViewLogSchema);
export default StudyViewLog;

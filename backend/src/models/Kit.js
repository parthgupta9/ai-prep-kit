/**
 * Kit Schema
 */

const mongoose = require('mongoose');

const KitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  input: {
    jd: { type: String, default: '' },
    company_url: { type: String, default: '' },
    days: { type: Number, default: 5 }
  },
  // Full Appendix A Kit object
  kitData: {
    type: Object,
    required: true
  },
  // User practice confidence progress: { questionId/flashcardId: { confidence: 1..3, lastReviewedAt: Date } }
  practiceState: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.Kit || mongoose.model('Kit', KitSchema);

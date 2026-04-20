import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  color:   { type: String, required: true },
  emoji:   { type: String, default: '◈' },
  iconUrl: { type: String, default: null },
}, { timestamps: true });

export default mongoose.models.Project || mongoose.model('Project', schema);

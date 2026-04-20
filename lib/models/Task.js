import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  priority:    { type: Number, default: 3 },
  attachments: [{ name: String, url: String, size: Number }],
}, { timestamps: true });

export default mongoose.models.Task || mongoose.model('Task', schema);

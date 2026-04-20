import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  date:      { type: String, required: true }, // 'YYYY-MM-DD'
  startHour: { type: Number, required: true },
  endHour:   { type: Number, required: true },
  status:    { type: String, enum: ['pending', 'done', 'failed'], default: null },
}, { timestamps: true });

export default mongoose.models.Entry || mongoose.model('Entry', schema);

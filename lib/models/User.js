import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', schema);

import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true
    },
    currentSeq: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export const Counter = mongoose.model('Counter', counterSchema);

import { Schema, model } from 'mongoose';

const workoutSchema = new Schema({
  title: { type: String, required: true, trim: true },
  focus: { type: String, required: true, trim: true, lowercase: true },
  minutes: { type: Number, required: true, min: 1 },
  difficulty: { type: String, required: true, trim: true, lowercase: true },
});

export const Workout = model('Workout', workoutSchema);

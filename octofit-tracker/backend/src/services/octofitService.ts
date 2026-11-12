import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  return error;
}

function notFound(message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = 404;
  return error;
}

function normalizeText(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`${field} is required`);
  }
  return value.trim();
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Activity details are required');
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (!mongoose.isValidObjectId(userId)) throw badRequest('userId must be a valid ObjectId');
  if (!mongoose.isValidObjectId(teamId)) throw badRequest('teamId must be a valid ObjectId');

  const user = await User.findById(userId);
  if (!user) throw badRequest('User not found');
  const team = await Team.findById(teamId);
  if (!team) throw badRequest('Team not found');

  const normalizedType = normalizeText(type, 'type').toLowerCase();
  const minuteCount = Number(minutes);
  if (!Number.isFinite(minuteCount) || minuteCount <= 0) throw badRequest('minutes must be a positive number');

  const points = Math.max(1, Math.round(minuteCount));
  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type: normalizedType,
    minutes: minuteCount,
    points,
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Team details are required');
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  const teamName = normalizeText(name, 'name');
  const teamMascot = normalizeText(mascot, 'mascot');

  const memberIds: mongoose.Types.ObjectId[] = [];
  for (const member of Array.isArray(members) ? members : []) {
    if (!mongoose.isValidObjectId(member)) {
      throw badRequest('members must include valid user ids');
    }
    const existingUser = await User.findById(member);
    if (!existingUser) throw badRequest('Member not found');
    memberIds.push(new mongoose.Types.ObjectId(member));
  }

  const team = await Team.create({
    name: teamName,
    mascot: teamMascot,
    members: memberIds,
  });

  if (memberIds.length > 0) {
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } });
  }

  return team.toObject();
}

export async function getLeaderboard() {
  const leaderboard = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $project: { teamName: '$team.name', totalPoints: 1, _id: 0 } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return leaderboard.map((entry, index) => ({
    teamName: entry.teamName,
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = normalizeText(userEmail, 'userEmail').toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).lean();
  if (!user) throw notFound(`No user found for ${normalizedEmail}`);

  const recentActivity = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const workoutPool = await Workout.find().sort({ minutes: 1 }).lean();
  const recentType = recentActivity[0]?.type ?? user.fitnessGoal;

  const scored = workoutPool.map((workout) => {
    const focus = String(workout.focus ?? '').toLowerCase();
    const goal = String(user.fitnessGoal ?? '').toLowerCase();
    const recentFocus = String(recentType ?? '').toLowerCase();

    let score = 0;
    if (focus === goal) score += 3;
    if (focus === recentFocus) score += 2;
    if (workout.minutes && Number(workout.minutes) >= 30) score += 1;

    return { workout, score };
  }).sort((a, b) => b.score - a.score || Number(a.workout.minutes ?? 0) - Number(b.workout.minutes ?? 0));

  const suggestions = (scored.length ? scored : [{ workout: workoutPool[0], score: 0 }])
    .map(({ workout }) => ({
      ...workout,
      title: workout.title,
      focus: workout.focus,
      minutes: workout.minutes,
      difficulty: workout.difficulty,
      reason: recentType
        ? `Based on your recent ${recentType} activity and ${goalOrFocus(user)} goal.`
        : `Built around your ${goalOrFocus(user)} goal.`,
    }));

  return suggestions;
}

function goalOrFocus(user: { fitnessGoal?: string } | null | undefined) {
  return String(user?.fitnessGoal ?? 'fitness').toLowerCase();
}

export { User };

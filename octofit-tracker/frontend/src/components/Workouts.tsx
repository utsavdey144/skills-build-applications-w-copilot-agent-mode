import { CapabilityCard } from './CapabilityCard.js';

export default function Workouts() {
  return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns." endpoint="/api/workouts/suggestions/mona@example.com" emptyLabel="workout suggestions" />;
}

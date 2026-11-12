import { useEffect, useState } from 'react';

type Item = Record<string, unknown>;
type Props = {
  title: string;
  description: string;
  endpoint: string;
  emptyLabel?: string;
};

function toList(data: Record<string, unknown>): Item[] {
  if (Array.isArray(data.activities)) return data.activities as Item[];
  if (Array.isArray(data.teams)) return data.teams as Item[];
  if (Array.isArray(data.leaderboard)) return data.leaderboard as Item[];
  if (Array.isArray(data.suggestions)) return data.suggestions as Item[];
  return [];
}

function renderValue(item: Item): string {
  if (typeof item.title === 'string') return item.title;
  if (typeof item.teamName === 'string') return item.teamName;
  if (typeof item.name === 'string') return item.name;
  if (typeof item.type === 'string') return item.type;
  if (typeof item.focus === 'string') return item.focus;
  if (typeof item.mascot === 'string') return item.mascot;
  return JSON.stringify(item);
}

export function CapabilityCard({ title, description, endpoint, emptyLabel }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('API request failed');
        const payload = (await response.json()) as Record<string, unknown>;
        if (!active) return;
        setItems(toList(payload));
      } catch {
        if (!active) return;
        setError(`Unable to load ${title.toLowerCase()}.`);
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [endpoint, title]);

  if (loading) {
    return <section className="card h-100"><div className="card-body"><h2 className="h4">{title}</h2><p>{description}</p><p role="status">Loading...</p></div></section>;
  }

  if (error) {
    return <section className="card h-100"><div className="card-body"><h2 className="h4">{title}</h2><p>{description}</p><div role="alert">{error}</div></div></section>;
  }

  if (items.length === 0) {
    return <section className="card h-100"><div className="card-body"><h2 className="h4">{title}</h2><p>{description}</p><p>No {emptyLabel ?? title.toLowerCase()}.</p></div></section>;
  }

  return <section className="card h-100"><div className="card-body"><h2 className="h4">{title}</h2><p>{description}</p><ul className="list-group list-group-flush">{items.map((item, index) => <li key={`${renderValue(item)}-${index}`} className="list-group-item">{renderValue(item)}{typeof item.minutes === 'number' ? ` (${item.minutes} min)` : ''}{typeof item.totalPoints === 'number' ? `: ${item.totalPoints}` : ''}{typeof item.reason === 'string' ? ` — ${item.reason}` : ''}</li>)}</ul></div></section>;
}

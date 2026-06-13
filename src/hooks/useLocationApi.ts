import { useQuery } from '@tanstack/react-query';

const BASE = 'https://countriesnow.space/api/v0.1';

async function safeFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function useCountries(): string[] {
  const { data } = useQuery({
    queryKey: ['location', 'countries'],
    queryFn: async () => {
      const json = await safeFetch<{ data: { name: string }[] }>(`${BASE}/countries/iso`);
      return json?.data?.map((c) => c.name) ?? [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data ?? [];
}

export function useCountryStates(country: string): string[] {
  const { data } = useQuery({
    queryKey: ['location', 'states', country],
    queryFn: async () => {
      const json = await safeFetch<{ data: { states: { name: string }[] } }>(
        `${BASE}/countries/states`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country }) },
      );
      return json?.data?.states?.map((s) => s.name) ?? [];
    },
    enabled: Boolean(country),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data ?? [];
}

export function useStateCities(country: string, state: string): string[] {
  const { data } = useQuery({
    queryKey: ['location', 'cities', country, state],
    queryFn: async () => {
      const json = await safeFetch<{ data: string[] }>(
        `${BASE}/countries/state/cities`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country, state }) },
      );
      return json?.data ?? [];
    },
    enabled: Boolean(country) && Boolean(state),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data ?? [];
}

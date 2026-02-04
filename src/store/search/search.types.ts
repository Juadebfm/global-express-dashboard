export interface SearchState {
  query: string;
}

export interface SearchStore extends SearchState {
  setQuery: (value: string) => void;
  clear: () => void;
}

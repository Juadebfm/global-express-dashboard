export interface SearchState {
  query: string;
}

export interface SearchContextValue extends SearchState {
  setQuery: (value: string) => void;
  clear: () => void;
}

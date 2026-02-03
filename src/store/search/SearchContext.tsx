import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { SearchContextValue, SearchState } from './search.types';

const initialState: SearchState = {
  query: '',
};

export const SearchContext = createContext<SearchContextValue | null>(null);

interface SearchProviderProps {
  children: ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps): ReactElement {
  const [state, setState] = useState<SearchState>(initialState);

  const setQuery = useCallback((value: string) => {
    setState({ query: value });
  }, []);

  const clear = useCallback(() => {
    setState({ query: '' });
  }, []);

  const value = useMemo<SearchContextValue>(
    () => ({
      ...state,
      setQuery,
      clear,
    }),
    [state, setQuery, clear]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

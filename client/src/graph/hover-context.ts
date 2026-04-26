import { createContext, useContext } from 'react';

interface HoverState {
  hoveredId: string | null;
  highlightedIds: Set<string>;
}

export const HoverContext = createContext<HoverState>({
  hoveredId: null,
  highlightedIds: new Set(),
});

export const useHoverState = () => useContext(HoverContext);

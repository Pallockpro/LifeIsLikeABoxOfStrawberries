import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Strawberry` : 'Strawberry — Play free browser games';
  }, [title]);
}

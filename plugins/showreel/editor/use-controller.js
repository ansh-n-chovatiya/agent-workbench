import { useEffect, useState } from 'preact/hooks';
// Re-renders a component whenever the controller's state changes.
export function useController(controller) {
  const [snapshot, setSnapshot] = useState(controller.getState());
  useEffect(() => { setSnapshot(controller.getState()); return controller.subscribe(setSnapshot); }, [controller]);
  return snapshot;
}

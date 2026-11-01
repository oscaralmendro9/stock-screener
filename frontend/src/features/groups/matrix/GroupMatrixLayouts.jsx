import { memo, useEffect, useState } from 'react';
import GroupMatrixGrid from './GroupMatrixGrid';
import GroupMatrixClusters from './GroupMatrixClusters';
const Grid = memo(GroupMatrixGrid);
const Clusters = memo(GroupMatrixClusters);
// Keep a visited layout's last props while inactive: filters only render the
// visible tree. Reusing its bounded DOM avoids rebuilding it on every switch.
const LayoutFrame = memo(function LayoutFrame({ active, View, layout, ...props }) {
  return <div data-matrix-layout={layout} aria-hidden={!active} inert={active ? undefined : ''}
    className={active ? 'relative visible' : 'pointer-events-none invisible absolute top-0 left-0 w-full'}>
    <View {...props} />
  </div>;
}, (previous, next) => !previous.active && !next.active);
export default function GroupMatrixLayouts({ layout, ...props }) {
  const [visited, setVisited] = useState(() => [layout]);
  useEffect(() => {
    setVisited(previous => previous.includes(layout) ? previous : [...previous, layout]);
  }, [layout]);
  return <div className="relative">
    {[['grid', Grid], ['clusters', Clusters]].map(([name, View]) =>
      (name === layout || visited.includes(name)) && <LayoutFrame key={name}
        active={name === layout} layout={name} View={View} {...props} />)}
  </div>;
}

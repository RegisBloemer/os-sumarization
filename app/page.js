import { Suspense } from 'react';
import Home from './HomeClient';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Home />
    </Suspense>
  );
}
import { Button } from '@/components/common/Button';
import { Dashboard } from '@/features/dashboard/Dashboard';

export default function Home() {
  return (
    <main>
      <h1>🐧 CodePuffin Next.js Example</h1>
      <Button label="Test Button for triggering import error" />
      <Dashboard />
    </main>
  );
}

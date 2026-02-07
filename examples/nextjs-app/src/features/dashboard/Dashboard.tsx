import { Button } from '@/components/common/Button';

export function Dashboard() {
  return (
    <section
      style={{
        border: '1px solid #ccc',
        padding: '1rem',
        borderRadius: '8px',
      }}
    >
      <h2>Dashboard Feature</h2>
      <p>This component is inside a feature module.</p>
      <Button label="Click Me" />
    </section>
  );
}

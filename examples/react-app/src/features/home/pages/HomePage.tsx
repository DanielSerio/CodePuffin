import { Button } from '../../../components/Button';

export function HomePage() {
  // Fix confirmed
  return (
    <div>
      <h1>Home Page</h1>
      <Button onClick={() => alert('Clicked!')}>Action Button</Button>
    </div>
  );
}

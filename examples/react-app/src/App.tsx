import { Page } from './routes/Page';

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>🐧 CodePuffin Example</h1>
      <p>
        This is a lightweight React app for testing architectural enforcement.
      </p>
      <hr />
      <Page />
    </div>
  );
}

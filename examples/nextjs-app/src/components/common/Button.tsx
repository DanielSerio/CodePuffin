'use client';

export function Button({ label }: { label: string }) {
  return (
    <button
      onClick={() => alert('Hello from CodePuffin!')}
      style={{
        padding: '8px 16px',
        backgroundColor: '#0070f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

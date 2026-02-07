export function Button({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        border: '1px solid #ccc',
        backgroundColor: '#f0f0f0',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="appShell">
      <div className="appPanel">{children}</div>
    </div>
  );
}

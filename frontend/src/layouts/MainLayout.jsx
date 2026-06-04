export default function MainLayout({ children }) {
  return (
    <div className="main-layout">
      <main className="layout-content">
        {children}
      </main>
    </div>
  );
}

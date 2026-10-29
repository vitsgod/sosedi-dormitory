export default function Loading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="loading-screen"
      role="status"
    >
      <span className="loading-dot" />
      Загружаем ваш дом…
    </main>
  );
}

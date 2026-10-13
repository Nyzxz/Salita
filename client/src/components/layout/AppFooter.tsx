export function AppFooter() {
  return (
    <footer className="border-t border-night-border">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:px-6 xl:px-8">
        <p>
          <span className="font-display font-semibold text-parchment">Salita</span> · Filipino words and the stories behind them
        </p>
        <p>Mabuhay! © {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}

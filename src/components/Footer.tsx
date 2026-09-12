import { useEffect, useState } from 'react';

export const Footer = () => {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    // default to dark based on our design
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <footer className="relative w-full flex flex-col items-center justify-center py-12 bg-[url('https://via.placeholder.com/1200x200/0a0a0c/111114?text=Footer')] bg-center bg-cover">
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="relative z-10 flex flex-col items-center gap-4 text-center text-text-primary">
        <p className="text-lg font-display">Solo Quest</p>
        <p className="text-sm text-text-muted">
          © 2025 Poorna Sri Nandyala. All rights reserved.
        </p>
        <div className="flex items-center space-x-4">
          <a href="#" className="hover:underline">
            GitHub
          </a>
          <a href="#" className="hover:underline">
            Twitter
          </a>
          <a href="#" className="hover:underline">
            Discord
          </a>
          <button
            onClick={toggleTheme}
            className="px-3 py-1 rounded hover:bg-white/10 transition-colors"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </footer>
  );
};
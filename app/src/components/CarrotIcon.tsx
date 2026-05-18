export default function CarrotIcon({ size = 28 }: { size?: number }) {
  const h = Math.round(size * 1.25);
  return (
    <svg width={size} height={h} viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Left leaf */}
      <path d="M11 11 C10 8 7 5 4 1 C8 4 11 8 11 11Z" fill="#56B455"/>
      {/* Right leaf */}
      <path d="M13 11 C14 8 17 5 20 1 C16 4 13 8 13 11Z" fill="#56B455"/>
      {/* Center leaf */}
      <path d="M12 10 C12.5 6 14 3 14.5 0 C13 3 11.5 6 12 10Z" fill="#2F8C30"/>
      {/* Carrot body */}
      <path d="M7 11 L17 11 C17 11 16.5 16 15 20 C13.5 24 12 30 12 30 C12 30 10.5 24 9 20 C7.5 16 7 11 7 11Z" fill="#F47820"/>
      {/* Highlight */}
      <path d="M9.5 12.5 C9.2 15 9 18 9.2 20.5" stroke="#FFB27A" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
}

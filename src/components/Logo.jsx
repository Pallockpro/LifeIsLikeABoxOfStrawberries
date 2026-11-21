import { Link } from 'react-router-dom';

export function StrawberryMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="mark">
      <path fill="var(--berry)" d="M16 29.5c-6.2-2.6-11-8.6-10.6-15C5.7 10.4 9.2 8.6 12.4 9.3c1.4.3 2.5.8 3.6.8s2.2-.5 3.6-.8c3.2-.7 6.7 1.1 7 5.2.4 6.4-4.4 12.4-10.6 15Z" />
      <path fill="rgba(0,0,0,.12)" d="M16 29.5c4.3-3.2 7.6-8.5 7.7-14.6.1-2.4-.8-4.4-2.3-5.5 2.9-.1 5.6 1.8 5.8 5.1.4 6.4-4.4 12.4-10.6 15Z" />
      <path fill="var(--leaf)" d="M16 11.2 10.6 8.4l3.1-.6-1.6-2.9L16 7l3.9-2.1-1.6 2.9 3.1.6Z" />
      <path fill="none" stroke="var(--leaf)" strokeWidth="1.6" strokeLinecap="round" d="M16 7c0-1.8.5-3.2 1.7-4.4" />
      <g fill="#FBE3C9">
        <ellipse cx="11" cy="14.5" rx=".8" ry="1.1" /><ellipse cx="16" cy="14" rx=".8" ry="1.1" /><ellipse cx="21" cy="14.5" rx=".8" ry="1.1" />
        <ellipse cx="13.4" cy="19" rx=".8" ry="1.1" /><ellipse cx="18.6" cy="19" rx=".8" ry="1.1" />
        <ellipse cx="9.6" cy="19.5" rx=".7" ry="1" /><ellipse cx="22.4" cy="19.5" rx=".7" ry="1" />
        <ellipse cx="16" cy="23.5" rx=".8" ry="1.1" /><ellipse cx="12.5" cy="24" rx=".7" ry="1" /><ellipse cx="19.5" cy="24" rx=".7" ry="1" />
      </g>
    </svg>
  );
}

export default function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Strawberry home">
      <StrawberryMark />
      <span className="logo-word">strawberry</span>
    </Link>
  );
}

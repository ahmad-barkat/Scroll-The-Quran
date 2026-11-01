import { NavLink } from 'react-router-dom';
import { Bookmark, BookOpenText, Compass, Search } from 'lucide-react';

const items = [
  { to: '/read', label: 'Read', icon: BookOpenText },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/saved', label: 'Saved', icon: Bookmark },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="bottom-nav-inner">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `bottom-nav-link ${isActive ? 'is-active' : ''}`}
              aria-label={item.label}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

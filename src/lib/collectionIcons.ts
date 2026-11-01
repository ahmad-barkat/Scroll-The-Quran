import {
  Anchor,
  BookOpen,
  Compass,
  Feather,
  Heart,
  Hourglass,
  Moon,
  Mountain,
  Scale,
  Shield,
  Sparkles,
  Sun,
  Sunrise,
  Trees,
  Users,
  Wheat,
  type LucideIcon,
} from 'lucide-react';

const COLLECTION_ICONS: Record<string, LucideIcon> = {
  heart: Heart,
  hourglass: Hourglass,
  sun: Sun,
  sunrise: Sunrise,
  feather: Feather,
  book: BookOpen,
  sparkles: Sparkles,
  wheat: Wheat,
  scale: Scale,
  moon: Moon,
  shield: Shield,
  mountain: Mountain,
  garden: Trees,
  compass: Compass,
  anchor: Anchor,
  users: Users,
};

export function collectionIcon(name: string): LucideIcon {
  return COLLECTION_ICONS[name] ?? Sparkles;
}

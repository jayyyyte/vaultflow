import React from "react";
import {
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  Banknote,
  Tag,
  Briefcase,
  Laptop,
  Home,
  ShoppingCart,
  Coffee,
  Zap,
  Car,
  ShoppingBag,
  Film,
  HeartPulse,
  Plane,
  Gift,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  Banknote,
  Tag,
  Briefcase,
  Laptop,
  Home,
  ShoppingCart,
  Coffee,
  Zap,
  Car,
  ShoppingBag,
  Film,
  HeartPulse,
  Plane,
  Gift,
};

export function DynamicIcon({
  name,
  className = "w-5 h-5",
  style,
}: {
  name?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!name) return <Tag className={className} style={style} />;
  const IconComponent = ICON_MAP[name] || Tag;
  return <IconComponent className={className} style={style} />;
}

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

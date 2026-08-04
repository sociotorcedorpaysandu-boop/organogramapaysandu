import {
  Accessibility,
  Award,
  Briefcase,
  Clock,
  GraduationCap,
  HandHeart,
  Handshake,
  HeartHandshake,
  Star,
  Tag,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Ícones discretos disponíveis para os tipos de colaboradores. */

export const COLLABORATOR_TYPE_ICONS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "tag", label: "Etiqueta", icon: Tag },
  { value: "accessibility", label: "Acessibilidade", icon: Accessibility },
  { value: "heart-handshake", label: "Aperto de mãos", icon: HeartHandshake },
  { value: "handshake", label: "Parceria", icon: Handshake },
  { value: "hand-heart", label: "Voluntariado", icon: HandHeart },
  { value: "graduation-cap", label: "Formatura", icon: GraduationCap },
  { value: "briefcase", label: "Maleta", icon: Briefcase },
  { value: "clock", label: "Relógio", icon: Clock },
  { value: "user-check", label: "Pessoa verificada", icon: UserCheck },
  { value: "users", label: "Pessoas", icon: Users },
  { value: "star", label: "Estrela", icon: Star },
  { value: "award", label: "Reconhecimento", icon: Award },
];

export function collaboratorTypeIcon(iconName: string | undefined): LucideIcon {
  const found = COLLABORATOR_TYPE_ICONS.find((option) => option.value === iconName);
  return found?.icon ?? Tag;
}

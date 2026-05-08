import { getTypeColor } from '../../lib/equipment-type-color';
import styles from './TypeBadge.module.css';

interface TypeBadgeProps {
  label: string;
}

export default function TypeBadge({ label }: TypeBadgeProps) {
  return (
    <span className={styles.badge} data-color={`type-${getTypeColor(label)}`}>
      {label}
    </span>
  );
}

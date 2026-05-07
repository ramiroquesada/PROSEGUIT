import styles from './StatusBadge.module.css';

type BadgeColor = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'new';

interface StatusBadgeProps {
  label: string;
  color: BadgeColor;
}

export default function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <span className={styles.badge} data-color={color}>
      {label}
    </span>
  );
}

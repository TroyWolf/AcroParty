import styles from './AcronymDisplay.module.css';

export default function AcronymDisplay({ acronym }) {
  if (!acronym) return null;
  return (
    <div className={styles.container}>
      {acronym.split('').map((letter, i) => (
        <span key={i} className={styles.letter}>{letter}</span>
      ))}
    </div>
  );
}

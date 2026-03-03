import styles from './DinoLoader.module.css';

export function DinoLoader() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.dino} />
      <div className={styles.eye} />
      <div className={styles.mouth} />
      <div className={styles.ground} />
    </div>
  );
}

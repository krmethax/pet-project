// components/Sidebar.js
import styles from './components/Sidebar.module.css';

const Sidebar = () => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h2>Admin Dashboard</h2>
      </div>
      <nav className={styles.nav}>
        <ul>
          <li>
            <a href='/dashboard'>
              หน้าแรก
            </a>
          </li>
          <li>
            <a href='/service'>
              ประเภทบริการ
            </a>
          </li>
          <li>
            <a href='/pet_types'>
              ประเภทสัตว์เลี้ยง
            </a>
          </li>
          <li>
            <a href='/payment'>
              การจัดการชำระเงิน
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;

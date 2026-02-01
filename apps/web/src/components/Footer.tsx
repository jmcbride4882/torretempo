import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p className="copyright">
          © {currentYear} Lakeside La Torre (Murcia) Group SL
        </p>
        <p className="developer">
          Designed and Developed by John McBride
        </p>
      </div>
    </footer>
  );
}

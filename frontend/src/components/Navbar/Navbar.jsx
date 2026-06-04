import './Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">Lunexa-Movix</div>
      <ul className="navbar-menu">
        <li><a href="/">Home</a></li>
        <li><a href="/cinemas">Cinemas</a></li>
        <li><a href="/profile">Profile</a></li>
      </ul>
    </nav>
  );
}

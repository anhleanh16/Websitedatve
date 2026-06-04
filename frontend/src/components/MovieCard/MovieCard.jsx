import './MovieCard.css';

export default function MovieCard({ movie }) {
  return (
    <div className="movie-card">
      <img src={movie.poster} alt={movie.title} className="movie-poster" />
      <div className="movie-info">
        <h3>{movie.title}</h3>
        <p className="rating">⭐ {movie.rating}</p>
        <p className="genre">{movie.genre}</p>
        <button className="book-btn">Book Now</button>
      </div>
    </div>
  );
}

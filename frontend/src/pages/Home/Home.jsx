import MovieCard from '../../components/MovieCard/MovieCard';

export default function Home() {
  const movies = [
    { id: 1, title: 'Movie 1', poster: 'https://via.placeholder.com/200x300', rating: 8.5, genre: 'Action' },
    { id: 2, title: 'Movie 2', poster: 'https://via.placeholder.com/200x300', rating: 7.8, genre: 'Drama' },
    { id: 3, title: 'Movie 3', poster: 'https://via.placeholder.com/200x300', rating: 9.0, genre: 'Sci-Fi' },
  ];

  return (
    <div className="home-page">
      <h1>Now Showing</h1>
      <div className="movies-grid">
        {movies.map(movie => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}

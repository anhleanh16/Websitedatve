import { Link } from 'react-router-dom'
import { FaClock, FaStar } from 'react-icons/fa'
import { toAbsoluteAssetUrl } from '../../utils/api'
import { formatAgeLimit } from './useAiAssistant'

export default function AiMovieCards({ movies = [], onNavigate }) {
  if (!movies.length) return null

  return (
    <div className='global-ai-movie-list' aria-label='Phim AI đề xuất'>
      {movies.map((movie) => (
        <Link
          key={movie.id}
          to={`/movie/${movie.id}`}
          className='global-ai-movie-card'
          onClick={onNavigate}
        >
          <div className='global-ai-movie-poster'>
            {movie.poster
              ? <img src={toAbsoluteAssetUrl(movie.poster)} alt={`Poster ${movie.title}`} loading='lazy' />
              : <span aria-hidden='true'>🎬</span>}
            {movie.ageLimit && <b>{formatAgeLimit(movie.ageLimit)}</b>}
          </div>
          <div className='global-ai-movie-info'>
            <strong title={movie.title}>{movie.title}</strong>
            <small>{movie.categories.slice(0, 2).join(' • ') || (movie.status === 'coming_soon' ? 'Sắp chiếu' : 'Đang chiếu')}</small>
            <div className='global-ai-movie-meta'>
              {movie.duration > 0 && <span><FaClock /> {movie.duration} phút</span>}
              {movie.rating !== null && <span><FaStar /> {movie.rating}</span>}
            </div>
            <span className='global-ai-movie-action'>Xem chi tiết</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

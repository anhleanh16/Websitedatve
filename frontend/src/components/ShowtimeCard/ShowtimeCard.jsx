export default function ShowtimeCard({ showtime }) {
  return (
    <div className="showtime-card">
      <h4>{showtime.time}</h4>
      <p>{showtime.cinema}</p>
      <p className="price">${showtime.price}</p>
      <button>Select</button>
    </div>
  );
}

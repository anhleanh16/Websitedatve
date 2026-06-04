export default function SeatMap({ onSelectSeat }) {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const columns = 10;

  return (
    <div className="seat-map">
      <h3>Select Your Seats</h3>
      <div className="seats-grid">
        {rows.map(row => (
          <div key={row} className="seat-row">
            {[...Array(columns)].map((_, i) => (
              <button
                key={`${row}${i + 1}`}
                className="seat"
                onClick={() => onSelectSeat(`${row}${i + 1}`)}
              >
                {row}{i + 1}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

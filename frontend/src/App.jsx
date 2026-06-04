import { Routes, Route } from 'react-router-dom';
import './App.css';
import { UserRoutes } from './user/routes/userRoutes';
import { AdminRoutes } from './admin/routes/adminRoutes';

function App() {
  return (
    <div className="app">
      <main className="app-content">
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes />} />
          <Route path="/*" element={<UserRoutes />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

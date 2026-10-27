import { Routes, Route, Link, NavLink } from 'react-router-dom';
import RfqList from './pages/RfqList.jsx';
import CreateRfq from './pages/CreateRfq.jsx';
import RfqDetails from './pages/RfqDetails.jsx';

export default function App() {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">British Auction RFQ</Link>
        <nav className="nav">
          <NavLink to="/" end>Auctions</NavLink>
          <NavLink to="/new">Create RFQ</NavLink>
        </nav>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<RfqList />} />
          <Route path="/new" element={<CreateRfq />} />
          <Route path="/rfqs/:id" element={<RfqDetails />} />
          <Route path="*" element={<p>Page not found. <Link to="/">Back to auctions</Link></p>} />
        </Routes>
      </main>
    </>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => (
  <nav className="bg-gray-800 text-white p-4">
    <ul className="flex space-x-4">
      <li><Link to="/">Home</Link></li>
      <li><Link to="/about">About</Link></li>
      <li><Link to="/login">Login</Link></li>
      <li><Link to="/signup">Sign Up</Link></li>
      <li><Link to="/dashboard">Dashboard</Link></li>
      <li><Link to="/properties">Properties</Link></li>
    </ul>
  </nav>
);

export default Navbar;

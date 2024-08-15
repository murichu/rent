import React, { useState } from 'react';

const VacantProperties = ({ properties }) => {
  const [filters, setFilters] = useState({ rooms: '', minPrice: '', maxPrice: '' });
  const [filteredProperties, setFilteredProperties] = useState(properties);

  const applyFilters = () => {
    fetch(`/api/properties/vacant?rooms=${filters.rooms}&minPrice=${filters.minPrice}&maxPrice=${filters.maxPrice}`)
      .then(res => res.json())
      .then(data => setFilteredProperties(data));
  };

  return (
    <div>
      <h2>Vacant Properties</h2>
      <div>
        <input type="number" placeholder="Rooms" value={filters.rooms} onChange={e => setFilters({ ...filters, rooms: e.target.value })} />
        <input type="number" placeholder="Min Price" value={filters.minPrice} onChange={e => setFilters({ ...filters, minPrice: e.target.value })} />
        <input type="number" placeholder="Max Price" value={filters.maxPrice} onChange={e => setFilters({ ...filters, maxPrice: e.target.value })} />
        <button onClick={applyFilters}>Apply Filters</button>
      </div>
      <ul>
        {filteredProperties.map(property => (
          <li key={property.id}>
            {property.address} - {property.type} - {property.rooms} rooms - ${property.price} - {property.isVacant ? 'Vacant' : 'Occupied'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VacantProperties;

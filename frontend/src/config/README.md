# API Configuration

This folder contains centralized API configuration for the frontend application.

## Files

### `api.js`
Contains all API endpoint definitions organized by resource.

## Usage

### Basic Usage

```javascript
import { API_ENDPOINTS } from '../config/api'
import apiClient from '../lib/axios'

// Using the configured axios client (recommended)
const response = await apiClient.get(API_ENDPOINTS.PROPERTIES.BASE)

// Or with regular axios
import axios from 'axios'
const response = await axios.get(API_ENDPOINTS.PROPERTIES.BASE)
```

### Examples

#### Fetch all properties
```javascript
import apiClient from '../lib/axios'
import { API_ENDPOINTS } from '../config/api'

const fetchProperties = async () => {
  const response = await apiClient.get(API_ENDPOINTS.PROPERTIES.BASE)
  return response.data
}
```

#### Fetch property by ID
```javascript
const fetchProperty = async (id) => {
  const response = await apiClient.get(API_ENDPOINTS.PROPERTIES.BY_ID(id))
  return response.data
}
```

#### Create a new unit
```javascript
const createUnit = async (unitData) => {
  const response = await apiClient.post(API_ENDPOINTS.UNITS.BASE, unitData)
  return response.data
}
```

#### Update a user
```javascript
const updateUser = async (id, userData) => {
  const response = await apiClient.patch(API_ENDPOINTS.USERS.BY_ID(id), userData)
  return response.data
}
```

#### Delete a notice
```javascript
const deleteNotice = async (id) => {
  await apiClient.delete(API_ENDPOINTS.NOTICES.BY_ID(id))
}
```

## Environment Variables

Set the backend API URL in `.env`:

```env
VITE_API_URL=http://localhost:4000
```

For production:
```env
VITE_API_URL=https://api.yourapp.com
```

## Benefits

1. **Centralized Configuration**: All API endpoints in one place
2. **Type Safety**: Easy to find and use endpoints with autocomplete
3. **Easy Updates**: Change endpoint structure in one place
4. **Consistency**: All components use the same endpoint definitions
5. **Environment Support**: Automatically uses correct API URL based on environment

## Adding New Endpoints

To add a new endpoint, update `api.js`:

```javascript
export const API_ENDPOINTS = {
  // ... existing endpoints
  
  NEW_RESOURCE: {
    BASE: `${API_VERSION}/new-resource`,
    BY_ID: (id) => `${API_VERSION}/new-resource/${id}`,
    CUSTOM_ACTION: (id) => `${API_VERSION}/new-resource/${id}/action`,
  },
}
```

Then use it in your components:

```javascript
import { API_ENDPOINTS } from '../config/api'
import apiClient from '../lib/axios'

const data = await apiClient.get(API_ENDPOINTS.NEW_RESOURCE.BASE)
```

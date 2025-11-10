// Simple API test script
// Run with: node test-api.js

const axios = require("axios");

const API_BASE_URL = "http://localhost:4000/api";

// Test endpoints without authentication first
async function testEndpoints() {
  console.log("🧪 Testing API Endpoints...\n");

  const endpoints = [
    "/leases",
    "/units",
    "/agents",
    "/agencies",
    "/invoices",
    "/penalties",
    "/messages",
    "/users",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint}`);
      console.log(
        `✅ ${endpoint}: ${response.status} - ${
          response.data?.data?.length || response.data?.length || 0
        } items`
      );
    } catch (error) {
      if (error.response) {
        console.log(
          `❌ ${endpoint}: ${error.response.status} - ${
            error.response.data?.error || error.message
          }`
        );
      } else {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
  }
}

testEndpoints();

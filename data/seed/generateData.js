/**
 * Data Generator Script
 * Generates mock data for the Railway Dashboard
 * Run with: node generateData.js
 */

const fs = require('fs');
const path = require('path');

const MOCK_DIR = path.join(__dirname, '../mock');

// Ensure mock directory exists
if (!fs.existsSync(MOCK_DIR)) {
  fs.mkdirSync(MOCK_DIR, { recursive: true });
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTrains() {
  const trainTypes = ['Rajdhani', 'Shatabdi', 'Vande Bharat', 'Superfast', 'Express', 'Freight'];
  const statuses = ['On Time', 'On Time', 'On Time', 'Minor Delay', 'Major Delay', 'Stopped'];
  
  const trains = [];
  for (let i = 1; i <= 50; i++) {
    const status = statuses[getRandomInt(0, statuses.length - 1)];
    const delay = status === 'On Time' ? 0 : (status === 'Minor Delay' ? getRandomInt(5, 29) : getRandomInt(30, 120));
    
    trains.push({
      train_number: (12000 + i).toString(),
      train_name: `${trainTypes[getRandomInt(0, trainTypes.length - 1)]} Exp`,
      type: trainTypes[getRandomInt(0, trainTypes.length - 1)],
      status: status,
      delay_minutes: delay,
      speed_kmh: status === 'Stopped' ? 0 : getRandomInt(60, 130),
      current_station: ['NDLS', 'BCT', 'HWH', 'MAS', 'SBC'][getRandomInt(0, 4)],
      current_location: {
        lat: 20.5937 + (Math.random() * 10 - 5), // Random point in India roughly
        lng: 78.9629 + (Math.random() * 10 - 5)
      },
      last_updated: new Date().toISOString()
    });
  }
  
  fs.writeFileSync(path.join(MOCK_DIR, 'trains.json'), JSON.stringify({ trains }, null, 2));
  console.log('Generated trains.json');
}

function generateUsers() {
  const users = {
    users: [
      {
        id: "1",
        username: "admin",
        password: "password123", // Mock password
        name: "John Doe",
        role: "Controller",
        zone: "NCR",
        preferences: { language: "English", theme: "Dark" }
      }
    ]
  };
  fs.writeFileSync(path.join(MOCK_DIR, 'users.json'), JSON.stringify(users, null, 2));
  console.log('Generated users.json');
}

function main() {
  console.log('Starting mock data generation...');
  generateTrains();
  generateUsers();
  
  // Also create empty files for other data structures
  fs.writeFileSync(path.join(MOCK_DIR, 'stations.json'), JSON.stringify({ stations: [] }));
  fs.writeFileSync(path.join(MOCK_DIR, 'conflicts.json'), JSON.stringify({ conflicts: [] }));
  fs.writeFileSync(path.join(MOCK_DIR, 'analytics.json'), JSON.stringify({ overview: {} }));
  fs.writeFileSync(path.join(MOCK_DIR, 'weather.json'), JSON.stringify({ stations: [] }));
  fs.writeFileSync(path.join(MOCK_DIR, 'notifications.json'), JSON.stringify({ notifications: [] }));
  
  console.log('Mock data generation complete!');
}

main();

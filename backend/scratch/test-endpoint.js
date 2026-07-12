require('dotenv').config();
const fuelService = require('../services/fuel/fuel.service');

async function test() {
  try {
    const res = await fuelService.getVehicleEfficiency('b4976ba5-6c70-426b-b9c7-023bde1cc3f9');
    console.log('Result:', res);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();

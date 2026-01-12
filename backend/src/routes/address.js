const express = require('express');
const router = express.Router();

const addressController = require('../controllers/addressController');

// ========== ADDRESS ROUTES (3NF Normalized) ==========
router.get('/address/divisions', addressController.getDivisions);
router.get('/address/districts', addressController.getDistricts);
router.get('/address/police-stations', addressController.getPoliceStations);
router.get('/address/unions', addressController.getUnions);
router.get('/address/villages', addressController.getVillages);
router.get('/address/hierarchy', addressController.getFullAddressHierarchy);
router.get('/address/search', addressController.searchLocations);

// ========== CATEGORY ROUTES ==========
router.get('/categories', addressController.getCategories);

module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/update-family-profile', authController.updateFamilyProfile);
router.get('/family-profile/:userId', authController.getFamilyProfile);

module.exports = router;
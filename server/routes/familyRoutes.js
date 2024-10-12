const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const upload = require('../middleware/upload'); // Make sure this middleware is set up

router.post('/update-family-profile', familyController.updateFamilyProfile);
router.delete('/delete-avatar/:userId/:avatarId', familyController.deleteAvatar);
router.post('/add-avatar', upload.single('image'), familyController.addAvatar); // Add this line

router.get('/chores/:avatarId', familyController.getChores);
router.post('/chores/:avatarId/add', familyController.addChore);
router.post('/chores/:avatarId/toggle', familyController.toggleChore);

module.exports = router;
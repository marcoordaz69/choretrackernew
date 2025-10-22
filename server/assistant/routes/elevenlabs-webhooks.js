const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

/**
 * POST /tools/create-task
 * ElevenLabs webhook for creating a task
 */
router.post('/tools/create-task', async (req, res) => {
  try {
    const { userId, title, priority, category, dueDate } = req.body;

    console.log('[ElevenLabs Tool] create_task called:', { userId, title, priority });

    if (!userId || !title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId and title'
      });
    }

    const result = await aiService.executeFunctionCall(userId, 'create_task', {
      title,
      priority: priority || 'medium',
      category: category || 'personal',
      dueDate
    });

    if (result.type === 'error') {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: `Task created: ${result.data.title}`,
      data: {
        taskId: result.data._id,
        title: result.data.title,
        priority: result.data.priority,
        dueDate: result.data.dueDate
      }
    });

  } catch (error) {
    console.error('[ElevenLabs Tool] Error in create-task:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /tools/log-habit
 * ElevenLabs webhook for logging a habit
 */
router.post('/tools/log-habit', async (req, res) => {
  try {
    const { userId, habitName, value, notes } = req.body;

    console.log('[ElevenLabs Tool] log_habit called:', { userId, habitName, value });

    if (!userId || !habitName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId and habitName'
      });
    }

    const result = await aiService.executeFunctionCall(userId, 'log_habit', {
      habitName,
      value,
      notes
    });

    if (result.type === 'error') {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    let message = '';
    if (result.type === 'habit_logged') {
      message = `${result.data.habitName} logged! Current streak: ${result.data.streak} days`;
    } else if (result.type === 'habit_created_and_logged') {
      message = `New habit created and logged: ${result.data.name}`;
    }

    return res.json({
      success: true,
      message,
      data: result.data
    });

  } catch (error) {
    console.error('[ElevenLabs Tool] Error in log-habit:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /tools/update-daily-metrics
 * ElevenLabs webhook for updating daily metrics
 */
router.post('/tools/update-daily-metrics', async (req, res) => {
  try {
    const { userId, sleepQuality, mood, energy, exerciseMinutes } = req.body;

    console.log('[ElevenLabs Tool] update_daily_metrics called:', { userId, sleepQuality, mood, energy });

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userId'
      });
    }

    const result = await aiService.executeFunctionCall(userId, 'update_daily_metrics', {
      sleepQuality,
      mood,
      energy,
      exerciseMinutes
    });

    if (result.type === 'error') {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: 'Daily metrics updated successfully',
      data: {
        sleepQuality: result.data.morning?.sleepQuality,
        mood: result.data.mood?.overall,
        energy: result.data.morning?.energy,
        exerciseMinutes: result.data.metrics?.exerciseMinutes
      }
    });

  } catch (error) {
    console.error('[ElevenLabs Tool] Error in update-daily-metrics:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /tools/create-goal
 * ElevenLabs webhook for creating a goal
 */
router.post('/tools/create-goal', async (req, res) => {
  try {
    const { userId, title, category, timeframe, targetValue, unit } = req.body;

    console.log('[ElevenLabs Tool] create_goal called:', { userId, title, timeframe });

    if (!userId || !title || !timeframe) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, title, and timeframe'
      });
    }

    const result = await aiService.executeFunctionCall(userId, 'create_goal', {
      title,
      category: category || 'personal',
      timeframe,
      targetValue,
      unit
    });

    if (result.type === 'error') {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: `Goal created: ${result.data.title}`,
      data: {
        goalId: result.data._id,
        title: result.data.title,
        category: result.data.category,
        timeframe: result.data.timeframe
      }
    });

  } catch (error) {
    console.error('[ElevenLabs Tool] Error in create-goal:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /tools/update-user-profile
 * ElevenLabs webhook for updating user profile
 */
router.post('/tools/update-user-profile', async (req, res) => {
  try {
    const { userId, name, timezone, onboarded, aiContext } = req.body;

    console.log('[ElevenLabs Tool] update_user_profile called:', { userId, name, onboarded });

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userId'
      });
    }

    const result = await aiService.executeFunctionCall(userId, 'update_user_profile', {
      name,
      timezone,
      onboarded,
      aiContext
    });

    if (result.type === 'error') {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: `Profile updated for ${result.data.name}`,
      data: {
        name: result.data.name,
        onboarded: result.data.onboarded,
        learningDataKeys: Object.keys(result.data.aiContext?.learningData || {})
      }
    });

  } catch (error) {
    console.error('[ElevenLabs Tool] Error in update-user-profile:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

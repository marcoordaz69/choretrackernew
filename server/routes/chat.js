const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const User = require('../models/User');
const { format, parse, addDays, subDays, startOfToday, nextDay, isSameDay, parseISO, isValid, getDay } = require('date-fns');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function parseDate(input, referenceDate = new Date()) {
  input = input.toLowerCase().trim();

  // Handle "today", "tomorrow", "yesterday"
  if (input === 'today') return referenceDate;
  if (input === 'tomorrow') return addDays(referenceDate, 1);
  if (input === 'yesterday') return subDays(referenceDate, 1);

  // Handle day names
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = days.indexOf(input);
  if (dayIndex !== -1) {
    const currentDay = getDay(referenceDate);
    const daysUntilTarget = (dayIndex + 7 - currentDay) % 7;
    return addDays(referenceDate, daysUntilTarget || 7); // If it's 0, we want next week
  }

  // Handle "next [day]" or "this [day]"
  const nextDayMatch = input.match(/^(next|this)\s+(\w+)$/);
  if (nextDayMatch) {
    const [, modifier, day] = nextDayMatch;
    const targetDayIndex = days.indexOf(day);
    if (targetDayIndex !== -1) {
      let targetDate = nextDay(referenceDate, targetDayIndex);
      if (modifier === 'next' || (modifier === 'this' && isSameDay(targetDate, referenceDate))) {
        targetDate = addDays(targetDate, 7);
      }
      return targetDate;
    }
  }

  // Handle specific date formats
  const dateFormats = [
    { regex: /^(\d{1,2})(st|nd|rd|th)?\s+of\s+(\w+)$/, format: 'd MMMM' },
    { regex: /^(\w+)\s+(\d{1,2})(st|nd|rd|th)?$/, format: 'MMMM d' },
    { regex: /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/, format: 'MM/dd/yyyy' },
  ];

  for (const { regex, format } of dateFormats) {
    const match = input.match(regex);
    if (match) {
      let dateString = match.slice(1).filter(Boolean).join(' ');
      if (!match[3] && format.includes('yyyy')) {
        dateString += ` ${referenceDate.getFullYear()}`; // Add current year if not provided
      }
      const parsedDate = parse(dateString, format, referenceDate);
      if (isValid(parsedDate)) return parsedDate;
    }
  }

  // Handle ISO date strings as a fallback
  const isoDate = parseISO(input);
  if (isValid(isoDate)) return isoDate;

  console.warn(`Unable to parse date: ${input}. Using reference date.`);
  return referenceDate;
}

function extractDateAndChore(message) {
  // Handle ISO 8601 date format (YYYY-MM-DD) for voice input
  const isoDateRegex = /(\d{4}-\d{2}-\d{2})/;
  const isoDateMatch = message.match(isoDateRegex);
  if (isoDateMatch) {
    return {
      dateString: isoDateMatch[1],
      isAddingChore: false
    };
  }

  // Improved regex to catch more variations of adding a chore with specific dates
  const addChoreRegex = /add (?:a )?chore (?:for|on) ((?:today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next \w+|this \w+|\d{1,2}(?:st|nd|rd|th)? of \w+|\w+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4})?)) to (.+)$/i;
  let match = message.match(addChoreRegex);
  if (match) {
    return { 
      dateString: match[1].trim(),
      choreName: match[2].trim(),
      isAddingChore: true 
    };
  }

  // If the above doesn't match, try a more general pattern
  const generalChoreRegex = /add (?:a )?chore (.+)/i;
  match = message.match(generalChoreRegex);
  if (match) {
    const fullText = match[1].trim();
    const dateRegex = /(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next \w+|this \w+|\d{1,2}(?:st|nd|rd|th)? of \w+|\w+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4})?)/i;
    const dateMatch = fullText.match(dateRegex);
    if (dateMatch) {
      return {
        dateString: dateMatch[0],
        choreName: fullText.replace(dateMatch[0], '').replace(/^(?:on|for)\s+/, '').trim(),
        isAddingChore: true
      };
    } else {
      return {
        choreName: fullText,
        dateString: 'today',
        isAddingChore: true
      };
    }
  }

  // If not adding a chore, extract date information for retrieval
  const dateRegex = /(?:for|on|this|next|)\s*(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next \w+|this \w+|\d{1,2}(?:st|nd|rd|th)? of \w+|\w+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4})?)/i;
  match = message.match(dateRegex);
  return { dateString: match ? match[1] : 'today', isAddingChore: false };
}

async function addChore(user, avatarId, choreName, choreDate) {
  const avatar = user.avatars.id(avatarId);
  if (!avatar) {
    throw new Error('Avatar not found');
  }

  const newChore = {
    name: choreName,
    date: format(choreDate, 'yyyy-MM-dd'),
    day: format(choreDate, 'EEEE'),
    isRecurring: false,
    completed: false,
  };

  avatar.chores.push(newChore);
  
  await user.save();
  return newChore;
}

function getChoresForDate(chores, targetDate) {
  const formattedTargetDate = format(targetDate, 'yyyy-MM-dd');
  const targetDayOfWeek = format(targetDate, 'EEEE');

  return chores.filter(chore => 
    chore.date === formattedTargetDate || 
    (chore.isRecurring && chore.days && chore.days.includes(targetDayOfWeek))
  );
}

function formatDateResponse(date) {
  return format(date, "EEEE 'the' do 'of' MMMM");
}

router.post('/', async (req, res) => {
  console.log('Received chat request:', req.body);
  try {
    const { message, avatarId } = req.body;

    if (!message) {
      console.error('No message provided');
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!avatarId) {
      console.error('No avatarId provided');
      return res.status(400).json({ error: 'avatarId is required' });
    }

    const user = await User.findOne({ 'avatars._id': avatarId });
    if (!user || !user.avatars.id(avatarId)) {
      console.error(`User or Avatar not found for avatar ID: ${avatarId}`);
      return res.status(404).json({ error: 'Avatar not found' });
    }

    const avatar = user.avatars.id(avatarId);
    const today = startOfToday();

    const { dateString, choreName, isAddingChore } = extractDateAndChore(message);
    const targetDate = parseDate(dateString, today);
    const formattedTargetDate = formatDateResponse(targetDate);

    console.log('Extracted date string:', dateString);
    console.log('Parsed target date:', targetDate);
    console.log('Formatted target date:', formattedTargetDate);
    console.log('Is adding chore:', isAddingChore);
    console.log('Chore name (if adding):', choreName);

    let responseMessage;

    if (isAddingChore) {
      const newChore = await addChore(user, avatarId, choreName, targetDate);
      responseMessage = `I've added the chore "${choreName}" for ${avatar.name} on ${formattedTargetDate}.`;
      console.log('Added new chore:', newChore);
    } else {
      const targetChores = getChoresForDate(avatar.chores, targetDate);
      console.log(`Chores for ${formattedTargetDate}:`, targetChores);

      const choreList = targetChores.map(c => c.name).join(', ');
      responseMessage = targetChores.length > 0
        ? `On ${formattedTargetDate}, ${avatar.name} has the following chores: ${choreList}.`
        : `On ${formattedTargetDate}, ${avatar.name} has no scheduled chores.`;
    }

    const systemMessage = `You are a helpful assistant for a chore management app. 
    The user's name is ${avatar.name}. 
    ${responseMessage}
    Today's date is ${formatDateResponse(today)}.
    When responding about chores for a specific date, use the format "${formattedTargetDate}" to refer to the date.
    Always use the user's name when listing chores.
    For recurring chores, mention that they occur weekly on that day.`;

    console.log('System message:', systemMessage);

    console.log('Sending request to OpenAI');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: message }
      ],
    });

    console.log('Received response from OpenAI:', completion);
    const aiResponse = completion.choices[0].message.content;
    console.log('AI response:', aiResponse);

    res.json({ message: aiResponse });
  } catch (error) {
    console.error('Error in chat route:', error);
    if (error.response) {
      console.error('OpenAI API error:', error.response.data);
    }
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

module.exports = router;

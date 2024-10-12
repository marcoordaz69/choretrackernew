const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function getChatbotResponse(message, avatarId) {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant for a chore management app." },
        { role: "user", content: message }
      ],
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error getting chatbot response:', error);
    throw error;
  }
}

module.exports = { getChatbotResponse };
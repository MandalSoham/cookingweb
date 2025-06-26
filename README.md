# Cooking Assistant

A voice-controlled cooking assistant that helps you follow recipes step by step with voice interaction.

## Features

- Browse and search recipes
- Voice-guided cooking instructions
- Interactive step-by-step guidance
- Voice recognition for proceeding to next steps
- Support for Indian and international recipes

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- OpenAI API key (for Whisper API)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install-all
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/cooking-assistant
   PORT=5000
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start the development servers:
   ```bash
   npm run dev
   ```

This will start both the backend server (port 5000) and the frontend development server (port 3000).

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Browse through the available recipes
3. Click on a recipe to view its details
4. Click "Start Voice Guide" to begin the voice-guided cooking process
5. Say "ok" or "next" to proceed to the next step

## Technologies Used

- Frontend: React.js
- Backend: Node.js with Express
- Database: MongoDB
- Voice Recognition: Web Speech API
- Voice Synthesis: Web Speech API
- Additional APIs: OpenAI Whisper API

## Contributing

Feel free to submit issues and enhancement requests! 
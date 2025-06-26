import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
// import VoiceGuide from './components/VoiceGuide'; // Assuming VoiceGuide is adjusted or its logic is moved directly into App1.js

// Custom hook for continuous speech recognition with safe restart (from App.js)
function useSpeechRecognition(onCommandDetected, onError) {
  const recognitionRef = useRef(null);
  const onCommandDetectedRef = useRef(onCommandDetected);
  const onErrorRef = useRef(onError);
  const isListeningRef = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    onCommandDetectedRef.current = onCommandDetected;
  }, [onCommandDetected]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!recognitionRef.current &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      const safeStart = () => {
        if (!isListeningRef.current || !recognitionRef.current) return;
        try {
          recognitionRef.current.start();
          console.log("Recognition safely started");
        } catch (e) {
          if (e.name === "InvalidStateError") {
            console.warn("Recognition already started");
          } else {
            console.error("Recognition error:", e);
          }
        }
      };

      recognition.onresult = (event) => {
        clearTimeout(timeoutRef.current);
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim().toLowerCase();
            console.log("Heard:", transcript);

            const keywords = ["pause", "next", "repeat", "restart"]; // "pause" is still recognized by the speech recognition engine
            for (const word of keywords) {
              if (transcript.includes(word)) {
                onCommandDetectedRef.current(word);
                break;
              }
            }
          }
        }

        // Timeout restart after inactivity
        timeoutRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            recognition.stop();
            safeStart();
          }
        }, 4000);
      };

      recognition.onerror = (event) => {
        onErrorRef.current(event.error);
        if (["not-allowed", "service-not-allowed"].includes(event.error)) return;
        recognition.stop();
        safeStart();
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          safeStart();
          console.log("Speech recognition restarted (onend)");
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const start = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      isListeningRef.current = true;
      try {
        recognitionRef.current.start();
        console.log("Speech recognition started");
      } catch (e) {
        console.warn("Start failed:", e);
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      isListeningRef.current = false;
      recognitionRef.current.stop();
      console.log("Speech recognition stopped");
    }
  }, []);

  return { start, stop };
}


function App() {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    title: '',
    description: '',
    ingredients: [''],
    steps: [''],
    cuisine: '',
    category: '',
    imageUrl: ''
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // isPaused is still used internally by speakStep and handleVoiceCommand
  const [error, setError] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  // New states for voice guide from App.js
  const [isListening, setIsListening] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      fetchMealsByName(searchQuery);
    } else if (selectedCuisine) {
      fetchMealsByCuisine(selectedCuisine);
    } else if (selectedCategory) {
      fetchMealsByCategory(selectedCategory);
    } else {
      fetchRandomMeal();
    }
  }, [searchQuery, selectedCuisine, selectedCategory]);

  // Existing fetch functions...
  const fetchRandomMeal = async () => {
    try {
      const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
      const data = await response.json();
      if (data.meals && data.meals.length > 0) {
        const meal = data.meals[0];
        const formattedRecipe = {
          _id: meal.idMeal,
          title: meal.strMeal,
          description: meal.strInstructions,
          ingredients: Object.keys(meal)
            .filter(key => key.startsWith('strIngredient') && meal[key])
            .map(key => `${meal[key]} - ${meal[`strMeasure${key.slice(13)}`]}`),
          steps: meal.strInstructions.split('\r\n').filter(step => step.trim()),
          cuisine: meal.strArea,
          category: meal.strCategory,
          imageUrl: meal.strMealThumb
        };
        setRecipes([formattedRecipe]);
      }
    } catch (error) {
      console.error('Error fetching random meal:', error);
    }
  };

  const fetchMealsByName = async (name) => {
    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${name}`);
      const data = await response.json();
      if (data.meals) {
        const formattedRecipes = data.meals.map(meal => ({
          _id: meal.idMeal,
          title: meal.strMeal,
          description: meal.strInstructions,
          ingredients: Object.keys(meal)
            .filter(key => key.startsWith('strIngredient') && meal[key])
            .map(key => `${meal[key]} - ${meal[`strMeasure${key.slice(13)}`]}`),
          steps: meal.strInstructions.split('\r\n').filter(step => step.trim()),
          cuisine: meal.strArea,
          category: meal.strCategory,
          imageUrl: meal.strMealThumb
        }));
        setRecipes(formattedRecipes);
      } else {
        setRecipes([]);
      }
    } catch (error) {
      console.error('Error fetching meals by name:', error);
    }
  };

  const fetchMealsByCuisine = async (cuisine) => {
    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${cuisine}`);
      const data = await response.json();
      if (data.meals) {
        const mealPromises = data.meals.map(meal =>
          fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`)
            .then(res => res.json())
            .then(data => data.meals[0])
        );
        const meals = await Promise.all(mealPromises);
        const formattedRecipes = meals.map(meal => ({
          _id: meal.idMeal,
          title: meal.strMeal,
          description: meal.strInstructions,
          ingredients: Object.keys(meal)
            .filter(key => key.startsWith('strIngredient') && meal[key])
            .map(key => `${meal[key]} - ${meal[`strMeasure${key.slice(13)}`]}`),
          steps: meal.strInstructions.split('\r\n').filter(step => step.trim()),
          cuisine: meal.strArea,
          category: meal.strCategory,
          imageUrl: meal.strMealThumb
        }));
        setRecipes(formattedRecipes);
      } else {
        setRecipes([]);
      }
    } catch (error) {
      console.error('Error fetching meals by cuisine:', error);
    }
  };

  const fetchMealsByCategory = async (category) => {
    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`);
      const data = await response.json();
      if (data.meals) {
        const mealPromises = data.meals.map(meal =>
          fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`)
            .then(res => res.json())
            .then(data => data.meals[0])
        );
        const meals = await Promise.all(mealPromises);
        const formattedRecipes = meals.map(meal => ({
          _id: meal.idMeal,
          title: meal.strMeal,
          description: meal.strInstructions,
          ingredients: Object.keys(meal)
            .filter(key => key.startsWith('strIngredient') && meal[key])
            .map(key => `${meal[key]} - ${meal[`strMeasure${key.slice(13)}`]}`),
          steps: meal.strInstructions.split('\r\n').filter(step => step.trim()),
          cuisine: meal.strArea,
          category: meal.strCategory,
          imageUrl: meal.strMealThumb
        }));
        setRecipes(formattedRecipes);
      } else {
        setRecipes([]);
      }
    } catch (error) {
      console.error('Error fetching meals by category:', error);
    }
  };

  const handleRecipeSelect = (recipe) => {
    setSelectedRecipe(recipe);
    setCurrentStepIndex(0); // Reset step index when a new recipe is selected
    setError(null);
    setIsPaused(false);
    setIsSpeaking(false);
    window.speechSynthesis.cancel(); // Stop any speaking when a new recipe is selected
  };

  const handleAddRecipe = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRecipe),
      });
      const data = await response.json();
      setRecipes([...recipes, data]);
      setShowAddRecipe(false);
      setNewRecipe({
        title: '',
        description: '',
        ingredients: [''],
        steps: [''],
        cuisine: '',
        category: '',
        imageUrl: ''
      });
    } catch (error) {
      console.error('Error adding recipe:', error);
    }
  };

  // speakStep from App.js
  const speakStep = useCallback(
    (text) => {
      if (!window.speechSynthesis) {
        setError("Speech synthesis not supported"); // This error can still be displayed
        return;
      }
      if (!text) return;

      window.speechSynthesis.cancel(); // Cancel any current speech

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((v) => v.lang === "en-US") || voices[0];
      if (voice) utterance.voice = voice;

      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => {
        setIsSpeaking(false);
      };
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error); // Log to console instead
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    },
    []
  );

  // This useEffect will now only trigger speakStep based on voice guide state.
  useEffect(() => {
    if (selectedRecipe && selectedRecipe.steps && selectedRecipe.steps.length > 0 && isListening && !isPaused) {
      speakStep(selectedRecipe.steps[currentStepIndex]);
    }
  }, [currentStepIndex, selectedRecipe, speakStep, isListening, isPaused]);


  const handleVoiceCommand = useCallback(
    (command) => {
      console.log("Voice command detected:", command);
      if (!selectedRecipe) return;

      switch (command) {
        case "pause":
          // The "pause" command logic is still here if you wish to use it via voice
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            setIsPaused(true);
          } else if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
          }
          break;

        case "next":
          if (currentStepIndex < selectedRecipe.steps.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
            setIsPaused(false); // Ensure not paused when moving to next
          } else {
            alert(`Congratulations! You've completed the recipe!`);
            // Optionally stop voice guide after completion
            // handleStopVoiceGuide();
          }
          break;

        case "repeat":
          setIsPaused(false); // Ensure not paused when repeating
          speakStep(selectedRecipe.steps[currentStepIndex]);
          break;

        case "restart":
          setCurrentStepIndex(0);
          setIsPaused(false); // Ensure not paused when restarting
          if (selectedRecipe.steps && selectedRecipe.steps.length > 0) {
            speakStep(selectedRecipe.steps[0]);
          }
          break;

        default:
          break;
      }
    },
    [currentStepIndex, selectedRecipe, speakStep]
  );

  const { start: startListening, stop: stopListening } = useSpeechRecognition(
    handleVoiceCommand,
    (error) => setError(error)
  );


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.ondataavailable = (e) => setAudioChunks((prev) => [...prev, e.data]);
      recorder.start();
      console.log("Recording started.");
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Microphone access denied or error starting recording.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const text = await sendAudioToSTT(audioBlob);
        alert('Transcribed text: ' + text);
        console.log("Recording stopped and transcribed.");
        // Clean up stream if needed
        if (mediaRecorder.stream) {
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        setMediaRecorder(null); // Reset media recorder state
        setAudioChunks([]); // Clear audio chunks
      };
    }
  };

  const handleStartVoiceGuide = () => {
    if (!selectedRecipe) {
      setError("Please select a recipe first.");
      return;
    }
    setError(null);
    startListening();
    setIsListening(true);
    startRecording(); // Start recording when voice guide starts
    if (selectedRecipe.steps && selectedRecipe.steps.length > 0) {
      speakStep(selectedRecipe.steps[currentStepIndex]); // Start speaking the current step
    }
  };

  const handleStopVoiceGuide = () => {
    stopListening();
    setIsListening(false);
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    setIsSpeaking(false);
    setIsPaused(false);
    stopRecording(); // Stop recording when voice guide stops
  };


  const addIngredient = () => {
    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, '']
    });
  };

  const addStep = () => {
    setNewRecipe({
      ...newRecipe,
      steps: [...newRecipe.steps, '']
    });
  };


  // sendAudioToBackend function (not used directly in UI now, but kept)
  const sendAudioToBackend = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const response = await fetch('http://localhost:5000/api/transcribe', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    console.log('Transcription:', data.text);
  };

  // fetchTTS function (not used directly in UI now, but kept)
  const fetchTTS = async (text) => {
    try {
      const response = await fetch('http://localhost:5000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS backend error:', errorText);
        throw new Error('TTS request failed');
      }
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      // Show a user-friendly error in your UI
    }
  };

  // sendAudioToSTT function (used by stopRecording)
  const sendAudioToSTT = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const response = await fetch('http://localhost:5000/api/stt', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    return data.text;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Cooking Assistant</h1>
        <button
          className="add-recipe-button"
          onClick={() => setShowAddRecipe(!showAddRecipe)}
        >
          {showAddRecipe ? 'Cancel' : 'Add New Recipe'}
        </button>
      </header>
      <main>
        <div className="recipe-list">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="filter-select"
            >
              <option value="">All Cuisines</option>
              <option value="indian">Indian</option>
              <option value="italian">Italian</option>
              <option value="chinese">Chinese</option>
              <option value="mexican">Mexican</option>
              <option value="american">American</option>
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              <option value="main">Main Course</option>
              <option value="appetizer">Appetizer</option>
              <option value="dessert">Dessert</option>
              <option value="breakfast">Breakfast</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          {showAddRecipe ? (
            <form onSubmit={handleAddRecipe} className="add-recipe-form">
              <h2>Add New Recipe</h2>
              <input
                type="text"
                placeholder="Recipe Title"
                value={newRecipe.title}
                onChange={(e) => setNewRecipe({...newRecipe, title: e.target.value})}
                required
              />
              <textarea
                placeholder="Description"
                value={newRecipe.description}
                onChange={(e) => setNewRecipe({...newRecipe, description: e.target.value})}
                required
              />
              <div className="ingredients-list">
                <h3>Ingredients</h3>
                {newRecipe.ingredients.map((ingredient, index) => (
                  <input
                    key={index}
                    type="text"
                    placeholder={`Ingredient ${index + 1}`}
                    value={ingredient}
                    onChange={(e) => {
                      const newIngredients = [...newRecipe.ingredients];
                      newIngredients[index] = e.target.value;
                      setNewRecipe({...newRecipe, ingredients: newIngredients});
                    }}
                    required
                  />
                ))}
                <button type="button" onClick={addIngredient}>Add Ingredient</button>
              </div>
              <div className="steps-list">
                <h3>Steps</h3>
                {newRecipe.steps.map((step, index) => (
                  <textarea
                    key={index}
                    placeholder={`Step ${index + 1}`}
                    value={step}
                    onChange={(e) => {
                      const newSteps = [...newRecipe.steps];
                      newSteps[index] = e.target.value;
                      setNewRecipe({...newRecipe, steps: newSteps});
                    }}
                    required
                  />
                ))}
                <button type="button" onClick={addStep}>Add Step</button>
              </div>
              <select
                value={newRecipe.cuisine}
                onChange={(e) => setNewRecipe({...newRecipe, cuisine: e.target.value})}
                required
              >
                <option value="">Select Cuisine</option>
                <option value="indian">Indian</option>
                <option value="italian">Italian</option>
                <option value="chinese">Chinese</option>
                <option value="mexican">Mexican</option>
                <option value="american">American</option>
              </select>
              <select
                value={newRecipe.category}
                onChange={(e) => setNewRecipe({...newRecipe, category: e.target.value})}
                required
              >
                <option value="">Select Category</option>
                <option value="main">Main Course</option>
                <option value="appetizer">Appetizer</option>
                <option value="dessert">Dessert</option>
                <option value="breakfast">Breakfast</option>
                <option value="snack">Snack</option>
              </select>
              <input
                type="url"
                placeholder="Image URL (optional)"
                value={newRecipe.imageUrl}
                onChange={(e) => setNewRecipe({...newRecipe, imageUrl: e.target.value})}
              />
              <button type="submit">Save Recipe</button>
            </form>
          ) : (
            <>
              <h2>Recipes</h2>
              {Array.isArray(recipes) && recipes.length === 0 ? (
                <p className="no-results">No recipes found. Try adjusting your search.</p>
              ) : (
                Array.isArray(recipes) && recipes.map((recipe) => (
                  <div
                    key={recipe._id}
                    className="recipe-card"
                    onClick={() => handleRecipeSelect(recipe)}
                  >
                    {recipe.imageUrl && (
                      <img src={recipe.imageUrl} alt={recipe.title} className="recipe-image" />
                    )}
                    <h3>{recipe.title}</h3>
                    <p>{recipe.description}</p>
                    <div className="recipe-tags">
                      {recipe.cuisine && <span className="tag">{recipe.cuisine}</span>}
                      {recipe.category && <span className="tag">{recipe.category}</span>}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
        {selectedRecipe && (
          <div className="recipe-details">
            <h2>{selectedRecipe.title}</h2>
            {selectedRecipe.imageUrl && (
              <img src={selectedRecipe.imageUrl} alt={selectedRecipe.title} className="recipe-detail-image" />
            )}
            <div className="ingredients">
              <h3>Ingredients:</h3>
              <ul>
                {selectedRecipe.ingredients.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </div>
            {/* Display current step and voice guide controls */}
            <h3>
              Step {currentStepIndex + 1} of {selectedRecipe.steps.length}:
            </h3>
            <p style={{ fontSize: 18, fontWeight: "bold" }}>
              {selectedRecipe.steps[currentStepIndex]}
            </p>

            <div className="voice-controls" style={{ marginTop: 20 }}>
              {!isListening ? (
                <button
                  onClick={handleStartVoiceGuide}
                  style={{ marginRight: 10, padding: "10px 15px" }}
                >
                  Start Voice Guide
                </button>
              ) : (
                <button
                  onClick={handleStopVoiceGuide}
                  style={{ marginRight: 10, padding: "10px 15px" }}
                >
                  Stop Voice Guide
                </button>
              )}

              <button
                onClick={() => handleVoiceCommand('next')} // Manually trigger next
                disabled={!isListening || currentStepIndex === selectedRecipe.steps.length - 1}
                style={{ marginRight: 10, padding: "10px 15px" }}
                title="Next step"
              >
                Next
              </button>

              <button
                onClick={() => handleVoiceCommand('repeat')} // Manually trigger repeat
                disabled={!isListening}
                style={{ marginRight: 10, padding: "10px 15px" }}
                title="Repeat current step"
              >
                Repeat
              </button>

              <button
                onClick={() => handleVoiceCommand('restart')} // Manually trigger restart
                disabled={!isListening}
                style={{ padding: "10px 15px" }}
                title="Restart recipe"
              >
                Restart
              </button>

              {isPaused && ( // This will only show if isPaused becomes true via voice command
                <button
                  onClick={() => handleVoiceCommand('pause')} // Use the voice command handler for resume
                  style={{ marginLeft: 10, padding: "10px 15px" }}
                  title="Resume speaking"
                >
                  Resume
                </button>
              )}
            </div>
            {error && (
              <p style={{ color: "red", marginTop: 10 }}>Error: {error}</p>
            )}
            <p
              style={{
                marginTop: 20,
                fontStyle: "italic",
                color: "#555",
              }}
            >
              Voice guide listens for commands: <b>next, repeat, restart</b>.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
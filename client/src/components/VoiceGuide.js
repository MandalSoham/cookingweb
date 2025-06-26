import React, { useState, useRef } from 'react';

const GAP_MS = 60000; // 1 minute

const VoiceGuide = ({ recipe }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  const speakStep = (text) => {
    return new Promise((resolve) => {
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.onend = resolve;
      window.speechSynthesis.speak(utterance);
    });
  };

  const startGuide = async () => {
    setIsRunning(true);
    for (let i = 0; i < recipe.steps.length; i++) {
      setCurrentStep(i);
      await speakStep(recipe.steps[i]);
      if (i < recipe.steps.length - 1) {
        await new Promise((resolve) => {
          timerRef.current = setTimeout(resolve, GAP_MS);
        });
      }
    }
    setIsRunning(false);
  };

  const stopGuide = () => {
    setIsRunning(false);
    clearTimeout(timerRef.current);
    window.speechSynthesis.cancel();
  };

  return (
    <div>
      <h2>Step {currentStep + 1} of {recipe.steps.length}</h2>
      <p>{recipe.steps[currentStep]}</p>
      <button onClick={startGuide} disabled={isRunning}>Start Voice Guide</button>
      <button onClick={stopGuide} disabled={!isRunning}>Stop</button>
    </div>
  );
};

export default VoiceGuide; 
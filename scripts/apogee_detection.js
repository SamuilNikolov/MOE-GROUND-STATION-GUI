function checkApogee(currentAlt) {
  // Track every altitude
  allAltitudesArray.push(currentAlt);
  console.log(currentAlt)
  // Keep last 10 alt for consecutive descending check
  descentHistory.push(currentAlt);
  if (descentHistory.length > apogeeDetectN) {
      descentHistory.shift();
  }

  // Track the max altitude for bars and apogee
  if (currentAlt > maxAltitudeReached) {
      maxAltitudeReached = currentAlt;
  }

  // Check if last N are strictly descending
  if (!apogeeAnnounced && descentHistory.length === apogeeDetectN) {
      let strictlyDescending = true;
      for (let i = 0; i < descentHistory.length - 1; i++) {
          if (descentHistory[i] <= descentHistory[i + 1]) {
              strictlyDescending = false;
              break;
          }
      }

      // Confirm apogee
      if (strictlyDescending) {
          // Apogee beep
          beep(2000, 800, 1, 'square');
          setTimeout(() => {speakMessage(`Apogee reached at ${Math.round(maxAltitudeReached)} meters`);},2000);
          
          apogeeAnnounced = true;
      }
  }
}

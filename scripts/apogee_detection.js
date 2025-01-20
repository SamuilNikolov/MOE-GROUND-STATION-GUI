const DESCENT_THRESHOLD = 100; // Meters below max to confirm apogee

function checkApogee(currentAlt) {
    // Track every altitude
    allAltitudesArray.push(currentAlt);
    
    // Track the max altitude
    if (currentAlt > maxAltitudeReached) {
        maxAltitudeReached = currentAlt;
    }
    
    // Check if we've descended enough from max to confirm apogee
    if (!apogeeAnnounced && (maxAltitudeReached - currentAlt) > DESCENT_THRESHOLD) {
        // Apogee beep
        beep(2000, 800, 1, 'square');
        setTimeout(() => {
            speakMessage(`Apogee reached at ${Math.round(maxAltitudeReached)} meters`);
        }, 2000);
        
        apogeeAnnounced = true;
    }
}
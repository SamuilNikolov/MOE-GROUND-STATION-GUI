
  /************************************************
   *     Bars Update
   ************************************************/
  function updateVelocity(velocity){
    const norm = Math.min(velocity/maxVelocity,1);
    rocket.style.height = (norm*100)+'%';
    velocityDisplay.innerText = 'Velocity: ' + velocity + ' km/h';

    document.querySelectorAll('#velocity-bar .tick-label').forEach(label=>{
      const val = parseInt(label.innerText,10);
      label.style.color = (velocity>=val)?'lime':'white';
    });
  }

  function updateAltitude(alt){
    const norm = Math.min(alt/maxAltitude,1);
    altitudeFill.style.height = (norm*100)+'%';
    altitudeDisplay.innerText='Altitude: '+Math.round(alt)+' m';

    document.querySelectorAll('#altitude-bar .tick-label').forEach(label=>{
      const val = parseInt(label.innerText,10);
      label.style.color = (alt>=val)?'lime':'white';
    });
  }

  function updateTemperature(temp){
    const norm = Math.min(temp/maxTemperature,1);
    temperatureFill.style.height=(norm*100)+'%';
    temperatureDisplay.innerText='Temp: '+temp+' °C';

    document.querySelectorAll('#temperature-bar .tick-label').forEach(label=>{
      const val = parseInt(label.innerText,10);
      label.style.color=(temp>=val)?'lime':'white';
    });
  }
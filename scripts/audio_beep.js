
  /************************************************
   *       Audio / Beep Setup
   ************************************************/
  let beepEnabled = false;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let selectedVoice = null;  // the chosen voice

  window.speechSynthesis.onvoiceschanged = () => {
    const voices = window.speechSynthesis.getVoices();
    // pick an english female voice if possible
    selectedVoice = voices.find(v => 
      v.lang.toLowerCase().includes('en') && v.name.toLowerCase().includes('female')
    ) || voices.find(v => v.lang.toLowerCase().includes('en')) || null;
  };

  // Generic beep function
  function beep(duration=100, frequency=880, volume=1, type='sine'){
    if(!beepEnabled) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode   = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    oscillator.start();
    setTimeout(()=>oscillator.stop(), duration);
  }
  function speakMessage(msg){
    if(!beepEnabled) return;
    const utter = new SpeechSynthesisUtterance(msg);
    if(selectedVoice) utter.voice=selectedVoice;
    utter.pitch=1;
    utter.rate =1.0;
    window.speechSynthesis.speak(utter);
  }
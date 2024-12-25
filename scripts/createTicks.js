function createTicks(barId, maxValue, interval){
    const bar = document.getElementById(barId);
    const numTicks = Math.floor(maxValue/interval);
    bar.querySelectorAll('.tick-label').forEach(t=>t.remove());
    for(let i=0; i<=numTicks; i++){
      const position = (i/numTicks)*100;
      const label = document.createElement('div');
      label.className = 'tick-label';
      label.style.bottom = position + '%';
      label.innerText = (i*interval).toString();
      bar.appendChild(label);
    }
  }